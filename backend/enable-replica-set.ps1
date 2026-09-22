# Run this in an ELEVATED (Administrator) PowerShell window:
#
#     powershell -ExecutionPolicy Bypass -File .\enable-replica-set.ps1
#
# Converts the local standalone MongoDB into a single-node replica set so
# mongoose transactions (used by storeService.createStore) work locally.
# Without it, POST /api/stores fails with HTTP 500:
#   "Transaction numbers are only allowed on a replica set member or mongos"
#
# Fully reversible - see the UNDO section at the bottom.
#
# This script used to hardcode the MongoDB 7.0 install path and shell out to
# `mongosh`. Neither holds on this machine (MongoDB is 8.2, and mongosh was
# never installed - the 1.6.0 folder the old comment referenced is gone), so
# it could never have run to completion. It now locates mongod.cfg itself and
# initiates the replica set through the backend's own mongodb driver.

$ErrorActionPreference = "Stop"

# --- 0. Require elevation (step 1 writes to Program Files, step 2 restarts a service) ---
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must run in an ELEVATED (Administrator) PowerShell window."
    exit 1
}

# --- 1. Locate mongod.cfg (highest installed server version) ---
$cfg = Get-ChildItem "C:\Program Files\MongoDB\Server\*\bin\mongod.cfg" -ErrorAction SilentlyContinue |
       Sort-Object { [version]$_.Directory.Parent.Name } -Descending |
       Select-Object -First 1

if (-not $cfg) {
    Write-Error "No mongod.cfg found under 'C:\Program Files\MongoDB\Server\*\bin\'. Is MongoDB installed there?"
    exit 1
}
$cfgPath = $cfg.FullName
Write-Output "Using config: $cfgPath"

# --- 2. Add replSetName to the config (only if not already present) ---
$content = Get-Content $cfgPath -Raw

# Port matters for step 4: rs.initiate() must name the same host:port the
# backend's MONGO_URI dials, or the driver will discover a member it cannot reach.
$port = 27017
if ($content -match "(?m)^\s*port:\s*(\d+)") { $port = [int]$Matches[1] }
$member = "127.0.0.1:$port"

if ($content -match "replSetName") {
    Write-Output "mongod.cfg already has a replSetName - skipping edit."
} else {
    $backup = "$cfgPath.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
    Copy-Item $cfgPath $backup
    Write-Output "Backed up original config to: $backup"

    $block = "replication:$([Environment]::NewLine)  replSetName: rs0"
    if ($content -match "(?m)^#replication:\s*$") {
        $content = $content -replace "(?m)^#replication:\s*$", $block
    } else {
        # No commented-out placeholder to swap - append the block instead.
        $content = $content.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $block + [Environment]::NewLine
    }

    # UTF-8 *without* BOM. Windows PowerShell 5.1's `Set-Content -Encoding utf8`
    # writes a BOM, which mongod's YAML parser rejects on startup.
    [System.IO.File]::WriteAllText($cfgPath, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "mongod.cfg updated (replSetName: rs0)."
}

# --- 3. Restart the MongoDB service so it picks up the new config ---
Restart-Service -Name MongoDB -Force
Write-Output "MongoDB service restarted - waiting for port $port ..."

$up = $false
foreach ($i in 1..30) {
    try {
        $probe = New-Object Net.Sockets.TcpClient
        $probe.Connect("127.0.0.1", $port)
        $probe.Close()
        $up = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $up) {
    Write-Error "mongod did not come back up on port $port. Check the log at '$($cfg.Directory.Parent.FullName)\log\mongod.log' (a bad config keeps the service from starting)."
    exit 1
}
Write-Output "mongod is accepting connections."

# --- 4. Initiate the replica set (one-time; safe to re-run) ---
# Uses the backend's bundled mongodb driver rather than mongosh, which is not
# installed on this machine. The member host is pinned to 127.0.0.1 to match
# both `bindIp: 127.0.0.1` and the backend's MONGO_URI - rs.initiate()'s default
# would name the machine hostname, which the driver then could not reach.
$driver = Join-Path $PSScriptRoot "node_modules\mongodb"
if (-not (Test-Path $driver)) {
    Write-Error "mongodb driver not found at '$driver'. Run 'npm install' in the backend first."
    exit 1
}

$initScript = Join-Path $env:TEMP "rs-initiate-$PID.js"
$js = @'
const { MongoClient } = require(process.env.RS_DRIVER);
const member = process.env.RS_MEMBER;

(async () => {
  const client = await MongoClient.connect(`mongodb://${member}/?directConnection=true`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  });
  const admin = client.db("admin").admin();

  try {
    await admin.command({
      replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: member }] },
    });
    console.log("Replica set rs0 initiated.");
  } catch (err) {
    if (err.codeName === "AlreadyInitialized" || /already initialized/i.test(err.message)) {
      console.log("Replica set already initialized - nothing to do.");
    } else {
      await client.close();
      throw err;
    }
  }

  // `setName` must be present too: a standalone also answers
  // isWritablePrimary:true, so that flag alone would report success against a
  // node where replication never actually came up. (`ismaster` is the pre-5.0
  // spelling, kept only for older servers - 8.2 no longer returns it.)
  for (let i = 0; i < 30; i++) {
    const hello = await admin.command({ hello: 1 });
    if (hello.setName && (hello.isWritablePrimary || hello.ismaster)) {
      console.log(`PRIMARY is ready (setName=${hello.setName}). Transactions are now supported.`);
      await client.close();
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  await client.close();
  throw new Error("timed out waiting for the node to become PRIMARY");
})().catch((err) => {
  console.error("rs.initiate failed: " + err.message);
  process.exit(1);
});
'@

try {
    [System.IO.File]::WriteAllText($initScript, $js, (New-Object System.Text.UTF8Encoding($false)))
    $env:RS_DRIVER = $driver
    $env:RS_MEMBER = $member
    node $initScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Remove-Item $initScript -ErrorAction SilentlyContinue
}

Write-Output ""
Write-Output "Done. Restart the backend (node/nodemon) process - store creation should now work."

# --- To UNDO later ---
# 1. Restore the backup this script made:
#      Copy-Item 'C:\Program Files\MongoDB\Server\<ver>\bin\mongod.cfg.bak-<stamp>' `
#                'C:\Program Files\MongoDB\Server\<ver>\bin\mongod.cfg' -Force
#    (or just re-comment the two lines: replication: / replSetName: rs0)
# 2. Restart-Service -Name MongoDB -Force
#    Existing data is untouched either way - this only changes how mongod runs.
