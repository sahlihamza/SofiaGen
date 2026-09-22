const fs = require('fs');
const path = require('path');

/**
 * fix_encoding.cjs
 *
 * Scans admin/, store/, and marketing/ for encoding issues and fixes them:
 *   1. Removes BOM (Byte Order Mark) from UTF-8 files
 *   2. Fixes double/triple-encoded UTF-8 characters in JSON translation files
 *      using Windows-1252 to UTF-8 round-trip decoding
 *   3. Fixes double-encoded characters in source files (.jsx, .js, .ts, .tsx)
 *
 * Usage:
 *   node scripts/fix_encoding.cjs            # report only
 *   node scripts/fix_encoding.cjs --fix      # fix all issues
 *   node scripts/fix_encoding.cjs --dry-run  # same as without flags
 */

const ROOT = path.resolve(__dirname, '..', '..'); // project root (sofiaGEN/)
const EXTENSIONS = ['.json', '.js', '.jsx', '.ts', '.tsx'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'public']);
const fixMode = process.argv.includes('--fix');

// Windows-1252 code point → byte lookup table
const win1252Map = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};
const win1252Table = (() => {
  const t = {};
  for (let i = 0; i <= 0xFF; i++) t[i] = i;
  for (const [code, byte] of Object.entries(win1252Map)) t[+code] = byte;
  return t;
})();

function win1252Encode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const byte = win1252Table[str.codePointAt(i)];
    if (byte === undefined) return null;
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function reverseEncoding(str, maxRounds = 5) {
  let result = str;
  for (let i = 0; i < maxRounds; i++) {
    const buffer = win1252Encode(result);
    if (!buffer) return result;
    const decoded = buffer.toString('utf8');
    if (decoded.includes('\uFFFD') || decoded === result) return result;
    result = decoded;
  }
  return result;
}

// Fix double-encoding selectively: only replace sequences that contain
// encoding-corruption markers (Ã, Â, etc.) while leaving the rest untouched.
function fixDoubleEncoding(str) {
  // Find runs of characters that could be double-encoded (Latin-1 supplement range)
  // and attempt to fix them individually.
  // Pattern: match sequences of 2+ chars from the Latin-1 supplement range
  // (0x80-0xFF) that may contain Win-1252-specific characters
  const corruptPattern = /[\u0080-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]+/g;
  return str.replace(corruptPattern, (match) => {
    const fixed = reverseEncoding(match, 3);
    return fixed;
  });
}

function hasBom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
}

function hasDoubleEncoded(str) {
  return /[ÃÂ]/.test(str);
}

// ---------------------------------------------------------------------------
// Word-level replacements for common corrupted patterns
// Each entry maps a corrupted string (containing \uFFFD or other markers)
// to the correct UTF-8 string.
// ---------------------------------------------------------------------------

const WORD_REPLACEMENTS = [
  // German
  { from: 'gew�nschten', to: 'gewünschten' },
  { from: 'gew�nschte', to: 'gewünschte' },
  { from: 'nat�rliches', to: 'natürliches' },
  { from: 'kosteng�nstig', to: 'kostengünstig' },
  { from: 'kosteng�nstiger', to: 'kostengünstiger' },
  { from: 'kosteng�nstigen', to: 'kostengünstigen' },
  { from: 'kosteng�nstige', to: 'kostengünstige' },
  { from: 'Funktionalit�ten', to: 'Funktionalitäten' },
  { from: 'abteilungs�bergreifender', to: 'abteilungsübergreifender' },
  { from: 'abteilungs�bergreifende', to: 'abteilungsübergreifende' },
  { from: 'bereichs�bergreifende', to: 'bereichsübergreifende' },
  { from: 'bereichs�bergreifender', to: 'bereichsübergreifender' },
  { from: 'Stra�enadresse', to: 'Straßenadresse' },
  { from: 'Bestell�bersicht', to: 'Bestellübersicht' },
  { from: 'Erfrischungsgetr�nk', to: 'Erfrischungsgetränk' },
  { from: 'Lebensmittelgesch�ft', to: 'Lebensmittelgeschäft' },
  { from: 'Qualit�tsprodukt', to: 'Qualitätsprodukt' },
  { from: 'Qualit�tsfrische', to: 'Qualitätsfrische' },
  { from: 'Qualit�t', to: 'Qualität' },
  { from: 'k�nnen', to: 'können' },
  { from: 'F�rdern', to: 'Fördern' },
  { from: 'revolution�re', to: 'revolutionäre' },
  { from: 'k�ndigen', to: 'kündigen' },
  { from: 'gr��ere', to: 'größere' },
  { from: 'W�hlen', to: 'Wählen' },
  { from: 'w�hlen', to: 'wählen' },
  { from: 'ben�tigtes', to: 'benötigtes' },
  { from: 'ben�tigten', to: 'benötigten' },
  { from: 'ben�tigte', to: 'benötigte' },
  { from: 't�glichen', to: 'täglichen' },
  { from: 't�glicher', to: 'täglicher' },
  { from: 't�gliches', to: 'tägliches' },
  { from: 't�gliche', to: 'tägliche' },
  { from: 't�glich', to: 'täglich' },
  { from: 'H�ndlern', to: 'Händlern' },
  { from: 'Pers�nliche', to: 'Persönliche' },
  { from: 'Pers�nlicher', to: 'Persönlicher' },
  { from: 'Glaubw�rdig', to: 'Glaubwürdig' },
  { from: 'glaubw�rdig', to: 'glaubwürdig' },
  { from: 'm�glich', to: 'möglich' },
  { from: 'Sch�nheit', to: 'Schönheit' },
  { from: 'B�ndelung', to: 'Bündelung' },
  { from: '�ber uns', to: 'Über uns' },
  { from: '�ber', to: 'über' },
  { from: '�ndern', to: 'ändern' },
  { from: 'abschlie�en', to: 'abschließen' },
  { from: 'best�tigen', to: 'bestätigen' },
  { from: 'Vollst�ndiger', to: 'Vollständiger' },
  { from: 'verf�gbar', to: 'verfügbar' },
  { from: 'Geld-zur�ck', to: 'Geld-zurück' },
  { from: 'F�r diesen', to: 'Für diesen' },
  { from: 'Sch�nheit und', to: 'Schönheit und' },
  { from: 'Lieferung per Nachnahme m�glich', to: 'Lieferung per Nachnahme möglich' },
  { from: 'Erfrischungsgetr�nk', to: 'Erfrischungsgetränk' },
  // French
  { from: '�quipe', to: 'équipe' },
  { from: 'th�me', to: 'thème' },
  { from: 'th�mes', to: 'thèmes' },
  { from: 'Id�al', to: 'Idéal' },
  { from: 'cr��e', to: 'créée' },
  { from: 'd�l�gue', to: 'délègue' },
  { from: 's�mantique', to: 'sémantique' },
  { from: 'r�pond', to: 'répond' },
  { from: 'r�ponse', to: 'réponse' },
  { from: 'v�rifi�', to: 'vérifié' },
  { from: 'Signal�', to: 'Signalé' },
  { from: 'Recalcul�', to: 'Recalculé' },
  { from: 'Acc�s refus�', to: 'Accès refusé' },
  { from: 'Utilis�', to: 'Utilisé' },
  { from: 'pagin�e', to: 'paginée' },
  { from: 'lat�ral', to: 'latéral' },
  { from: 'm�moire', to: 'mémoire' },
  { from: 'g�rer', to: 'gérer' },
  { from: 'r�guli�re', to: 'régulière' },
  { from: 'fran�aise', to: 'française' },
  { from: 'soci�t�', to: 'société' },
  { from: 'fonctionnalit�s', to: 'fonctionnalités' },
  { from: 'd�veloppement', to: 'développement' },
  { from: 'con�ue', to: 'conçue' },
  { from: '�v�nements', to: 'événements' },
  { from: '�tude', to: 'étude' },
  { from: '�tudes', to: 'études' },
  { from: 'caract�ristiques', to: 'caractéristiques' },
  { from: 'int�gration', to: 'intégration' },
  { from: 'r�solution', to: 'résolution' },
  { from: 's�lection', to: 'sélection' },
  { from: 'd�connexion', to: 'déconnexion' },
  { from: 'd�marrer', to: 'démarrer' },
  { from: 'am�lioration', to: 'amélioration' },
  { from: 'exp�rience', to: 'expérience' },
  { from: 'qualit�', to: 'qualité' },
  { from: 'compr�hension', to: 'compréhension' },
  { from: 'op�rationnel', to: 'opérationnel' },
  { from: 'donn�es', to: 'données' },
  { from: 'centralis�s', to: 'centralisés' },
  { from: 'paiement � la livraison', to: 'paiement à la livraison' },
  { from: 'Cr�er', to: 'Créer' },
  { from: 'cr�er', to: 'créer' },
  { from: 'Cr�ez', to: 'Créez' },
  { from: 'd�velopper', to: 'développer' },
  { from: 'D�marrer', to: 'Démarrer' },
  { from: 'D�tail', to: 'Détail' },
  { from: 'Pr�c�dent', to: 'Précédent' },
  { from: 'R�capitulatif', to: 'Récapitulatif' },
  { from: 'T�moignages', to: 'Témoignages' },
  { from: 'Nouveaut�s', to: 'Nouveautés' },
  { from: 'Carri�res', to: 'Carrières' },
  { from: 'Int�grations', to: 'Intégrations' },
  { from: 'Disponibilit�', to: 'Disponibilité' },
  { from: 'Confidentialit�', to: 'Confidentialité' },
  { from: 'Conditions g�n�rales', to: 'Conditions générales' },
  { from: 'Conditions G�n�rales', to: 'Conditions Générales' },
  { from: 'Informations l�gales', to: 'Informations légales' },
  { from: 't�l�phone', to: 'téléphone' },
  { from: 'R�ponse', to: 'Réponse' },
  { from: 'ouvr�es', to: 'ouvrées' },
  { from: 'Notre �quipe', to: 'Notre équipe' },
  { from: 'd�taill�', to: 'détaillé' },
  { from: 'qualit� de service', to: 'qualité de service' },
  { from: 's�curiser', to: 'sécuriser' },
  { from: 'actualit�s', to: 'actualités' },
  { from: 'Migration compl�te', to: 'Migration complète' },
  { from: 'demi-journ�e', to: 'demi-journée' },
  { from: 'stocks en temps r�el', to: 'stocks en temps réel' },
  { from: 'R�duction', to: 'Réduction' },
  { from: 'Int�gration native', to: 'Intégration native' },
  { from: 'Beaut�', to: 'Beauté' },
  { from: 'cosm�tiques', to: 'cosmétiques' },
  { from: 'migr�', to: 'migré' },
  { from: 'europ�enne', to: 'européenne' },
  { from: 'march�', to: 'marché' },
  { from: 'g�re', to: 'gère' },
  { from: 'bas�', to: 'basé' },
  { from: 'Compr�hension', to: 'Compréhension' },
  { from: '�conomie', to: 'Économie' },
  { from: 'imm�diatement', to: 'immédiatement' },
  { from: 'seuil de rentabilit�', to: 'seuil de rentabilité' },
  { from: 'rentabilit�', to: 'rentabilité' },
  { from: 'co�ts', to: 'coûts' },
  { from: 'Vie priv�e', to: 'Vie privée' },
  { from: 'Donn�es invalides', to: 'Données invalides' },
  { from: 'Param�tres', to: 'Paramètres' },
  { from: 'r�cup�r�s', to: 'récupérés' },
  { from: 'r�cup�r�e', to: 'récupérée' },
  { from: 'r�cup�r�es', to: 'récupérées' },
  { from: 'r�cup�r� avec succ�s', to: 'récupéré avec succès' },
  { from: 'mis � jour', to: 'mis à jour' },
  { from: 'r�ussi', to: 'réussi' },
  { from: 'cr��', to: 'créé' },
  { from: 'cr��e', to: 'créée' },
  { from: 'd�j�', to: 'déjà' },
  { from: 'supprim�', to: 'supprimé' },
  { from: 'supprim�e', to: 'supprimée' },
  { from: 'supprim�s', to: 'supprimés' },
  { from: 'supprim� avec succ�s', to: 'supprimé avec succès' },
  { from: 'annul�', to: 'annulé' },
  { from: 'annul�e', to: 'annulée' },
  { from: 'annul�s', to: 'annulés' },
  { from: 'annul� avec succ�s', to: 'annulé avec succès' },
  { from: 'activ�', to: 'activé' },
  { from: 'activ�e', to: 'activée' },
  { from: 'activ�s', to: 'activés' },
  { from: 'activ� avec succ�s', to: 'activé avec succès' },
  { from: 'd�sactiv�', to: 'désactivé' },
  { from: 'd�sactiv�e', to: 'désactivée' },
  { from: 'd�sactiv�s', to: 'désactivés' },
  { from: 'd�sactiv� avec succ�s', to: 'désactivé avec succès' },
  { from: 'archiv�', to: 'archivé' },
  { from: 'archiv�e', to: 'archivée' },
  { from: 'archiv�s', to: 'archivés' },
  { from: 'archiv� avec succ�s', to: 'archivé avec succès' },
  { from: 'restaur�', to: 'restauré' },
  { from: 'restaur�e', to: 'restaurée' },
  { from: 'restaur�s', to: 'restaurés' },
  { from: 'restaur� avec succ�s', to: 'restauré avec succès' },
  { from: 'appliqu�', to: 'appliqué' },
  { from: 'appliqu�e', to: 'appliquée' },
  { from: 'appliqu�s', to: 'appliqués' },
  { from: 'appliqu� avec succ�s', to: 'appliqué avec succès' },
  { from: 'dupliqu�', to: 'dupliqué' },
  { from: 'dupliqu�e', to: 'dupliquée' },
  { from: 'dupliqu�s', to: 'dupliqués' },
  { from: 'dupliqu� avec succ�s', to: 'dupliqué avec succès' },
  { from: 'ajout�', to: 'ajouté' },
  { from: 'ajout�e', to: 'ajoutée' },
  { from: 'ajout�s', to: 'ajoutés' },
  { from: 'ajout� avec succ�s', to: 'ajouté avec succès' },
  { from: 'cr�� avec succ�s', to: 'créé avec succès' },
  { from: 'mis � jour avec succ�s', to: 'mis à jour avec succès' },
  { from: 'export�es', to: 'exportées' },
  { from: 'anonymis�es', to: 'anonymisées' },
  { from: 'Rembours�e', to: 'Remboursée' },
  { from: 'Exp�di�e', to: 'Expédiée' },
  { from: 'Paiement accept�', to: 'Paiement accepté' },
  { from: 'En pr�paration', to: 'En préparation' },
  { from: 'Termin�e', to: 'Terminée' },
  { from: 'Annul�e', to: 'Annulée' },
  { from: 'plafonn�e', to: 'plafonnée' },
  { from: 'extensions autoris�es', to: 'extensions autorisées' },
  { from: 'ex�cutables', to: 'exécutables' },
  { from: 'Sch�ma', to: 'Schéma' },
  { from: 'encod�es', to: 'encodées' },
  { from: 'Validation �chou�e', to: 'Validation échouée' },
  { from: 'journalis�es', to: 'journalisées' },
  { from: 'prot�g�es', to: 'protégées' },
  { from: 'prot�g�s', to: 'protégés' },
  { from: 'syst�me', to: 'système' },
  { from: 'd�pr�ciation', to: 'dépréciation' },
  { from: 'r�f�rence', to: 'référence' },
  { from: 'r�versible', to: 'réversible' },
  { from: 'd�faut', to: 'défaut' },
  { from: 'cat�gories', to: 'catégories' },
  { from: 'filtre lat�ral', to: 'filtre latéral' },
  { from: 'suppos�', to: 'supposé' },
  { from: 'd�connexion', to: 'déconnexion' },
  { from: 'forc�e', to: 'forcée' },
  { from: 'd�tails', to: 'détails' },
  { from: 'recalcul�', to: 'recalculé' },
  { from: 'marqu�es', to: 'marquées' },
  { from: 'Le mod�le', to: 'Le modèle' },
  { from: 'ao�t', to: 'août' },
  { from: 'r�gles', to: 'règles' },
  { from: 'r�gle', to: 'règle' },
  { from: 'R�le', to: 'Rôle' },
  { from: 'r�le', to: 'rôle' },
  { from: 'r�les', to: 'rôles' },
  { from: 'pr�d�finis', to: 'prédéfinis' },
  { from: 'renomm�s', to: 'renommés' },
  // Spanish/Portuguese
  { from: 'S�o Paulo', to: 'São Paulo' },
  { from: 'Bras�lia', to: 'Brasília' },
  { from: 'M�xico', to: 'México' },
  { from: 'Per�', to: 'Perú' },
  { from: 'Rep�blica Dominicana', to: 'República Dominicana' },
  { from: 'Eimsb�ttel', to: 'Eimsbüttel' },
  { from: 'Fourvi�re', to: 'Fourvière' },
  // Currency
  { from: '�500', to: '€500' },
  { from: '500,00 �', to: '500,00 €' },
  { from: '�100', to: '€100' },
  { from: '100 �', to: '100 €' },
  // More French
  { from: '� propos', to: 'à propos' },
  { from: 'A � Z', to: 'A à Z' },
  { from: 'Cr�er mon compte', to: 'Créer mon compte' },
  { from: 'Cr�er ma boutique', to: 'Créer ma boutique' },
  { from: 'Points cl�s', to: 'Points clés' },
  { from: 'Aucun th�me', to: 'Aucun thème' },
  { from: 'Aucun r�sultat', to: 'Aucun résultat' },
  { from: 'r�sultat', to: 'résultat' },
  { from: 'comparatif d�taill�', to: 'comparatif détaillé' },
  { from: 'march� tunisien', to: 'marché tunisien' },
  { from: 'Pr�t � lancer', to: 'Prêt à lancer' },
  { from: 'Op�rationnel', to: 'Opérationnel' },
  { from: 'Performance d�grad�e', to: 'Performance dégradée' },
  { from: 'Donn�es en temps r�el', to: 'Données en temps réel' },
  { from: 'momentan�ment', to: 'momentanément' },
  { from: 'affich�es', to: 'affichées' },
  { from: 'D�penses', to: 'Dépenses' },
  { from: 'Co�t', to: 'Coût' },
  { from: 'Le seuil de rentabilit�', to: 'Le seuil de rentabilité' },
  { from: 'Rentabilit�', to: 'Rentabilité' },
  { from: 'marge r�elle', to: 'marge réelle' },
  { from: 'outil de gestion n�1', to: 'outil de gestion n°1' },
  { from: 'int�gr�s', to: 'intégrés' },
  { from: 'multi-boutique, RBAC avanc�', to: 'multi-boutique, RBAC avancé' },
  { from: 'Demandez une d�mo', to: 'Demandez une démo' },
  { from: 'Th�me s�lectionn�', to: 'Thème sélectionné' },
  { from: '� partir du', to: 'à partir du' },
  { from: '� la livraison', to: 'à la livraison' },
  { from: '� la une', to: 'à la une' },
  { from: '� votre', to: 'à votre' },
  { from: '� vie', to: 'à vie' },
  { from: '� l&apos;', to: 'à l&apos;' },
  { from: 'Le d�tail', to: 'Le détail' },
  { from: 'commandes trait�es', to: 'commandes traitées' },
  { from: 'boutiques lanc�es', to: 'boutiques lancées' },
  { from: 'voyez imm�diatement', to: 'voyez immédiatement' },
  { from: 'donn�es en temps r�el', to: 'données en temps réel' },
  { from: 'Aucun incident signal�', to: 'Aucun incident signalé' },
  { from: 'revenus', to: 'revenus' },
  { from: 'multi-boutique', to: 'multi-boutique' },
  { from: 'audit', to: 'audit' },
  { from: 'WebSocket', to: 'WebSocket' },
  { from: 'Cron', to: 'Cron' },
  { from: 'pool', to: 'pool' },
  { from: 'TTL', to: 'TTL' },
  { from: 'next', to: 'next' },
  { from: 'flushall', to: 'flushall' },
  { from: 'dashboard', to: 'dashboard' },
  { from: 'worker', to: 'worker' },
  { from: 'timeout', to: 'timeout' },
  { from: 'backpressure', to: 'backpressure' },
  { from: 'heartbeat', to: 'heartbeat' },
  { from: 'bug', to: 'bug' },
  { from: 'retry', to: 'retry' },
  { from: 'catch', to: 'catch' },
  { from: 'socket', to: 'socket' },
  { from: 'noeud', to: 'noeud' },
  { from: 'drainer', to: 'drainer' },
  { from: 'stream', to: 'stream' },
  { from: 'pipeline', to: 'pipeline' },
  { from: 'feature flag', to: 'feature flag' },
  { from: 'throttling', to: 'throttling' },
  { from: 'load balancer', to: 'load balancer' },
  { from: 'inbox', to: 'inbox' },
  { from: 'outbox', to: 'outbox' },
  { from: 'exactly-once', to: 'exactly-once' },
  { from: 'at-least-once', to: 'at-least-once' },
  { from: 'data race', to: 'data race' },
  { from: 'mutex', to: 'mutex' },
  { from: 'sémaphore', to: 'sémaphore' },
  { from: 'verrou', to: 'verrou' },
  { from: 'monitoring', to: 'monitoring' },
  { from: 'tracing', to: 'tracing' },
  { from: 'debug', to: 'debug' },
  { from: 'hotfix', to: 'hotfix' },
  { from: 'patch', to: 'patch' },
  { from: 'rollout', to: 'rollout' },
  { from: 'rollback', to: 'rollback' },
  { from: 'changelog', to: 'changelog' },
  { from: 'breaking change', to: 'breaking change' },
  { from: 'soft delete', to: 'soft delete' },
  { from: 'hard delete', to: 'hard delete' },
  { from: 'soft launch', to: 'soft launch' },
  { from: 'hard launch', to: 'hard launch' },
  { from: 'abonnement', to: 'abonnement' },
  { from: 'facturation', to: 'facturation' },
  { from: 'paiement', to: 'paiement' },
  { from: 'remboursement', to: 'remboursement' },
  { from: 'avoir', to: 'avoir' },
  { from: 'échéances', to: 'échéances' },
  { from: 'échéance', to: 'échéance' },
  { from: 'à', to: 'à' },
  { from: 'ç', to: 'ç' },
  // Common single words
  { from: 'déjà', to: 'déjà' },
  { from: 'pièce', to: 'pièce' },
  { from: 'pièces', to: 'pièces' },
  // Star rating patterns (★ got corrupted to \uFFFD)
  { from: '{"�&".repeat(rating)}', to: '{"★".repeat(rating)}' },
  { from: '{"�&".repeat(5 - rating)}', to: '{"☆".repeat(5 - rating)}' },
  { from: '�&".repeat(rating)', to: '★".repeat(rating)' },
  { from: '�&".repeat(5 - rating)', to: '☆".repeat(5 - rating)' },
  // Tree indentation
  { from: '{"�".repeat(o.depth)}', to: '{"—".repeat(o.depth)}' },
  { from: '�".repeat(o.depth)', to: '—".repeat(o.depth)' },
  { from: '�".repeat(depth)', to: '—".repeat(depth)' },
  // Arrow/separator patterns
  { from: '>�</span>', to: '>→</span>' },
  { from: '>�</', to: '>→</' },
  // No change label
  { from: '� No change �', to: '— No change —' },
  { from: 'value="">� No change �', to: 'value="">— No change —' },
  // Range separator in pagination
  { from: '${from}�${to}', to: '${from}–${to}' },
  { from: '`${from}�${to}`', to: '`${from}–${to}`' },
  { from: ' `${from}�${to} `', to: ' `${from}–${to} `' },
  { from: '`${from}–${to} sur ${totalResults}`', to: '`${from}–${to} sur ${totalResults}`' },
  // Closing parenthesis after corrupted char
  { from: 'Fulfillment)�\n+ ', to: 'Fulfillment)\n+ ' },
  // Test expectation with corrupted char
  { from: 'toMatch(/�/)', to: 'toMatch(/—/)' },
  { from: 'toMatch(/�/', to: 'toMatch(/—/' },
  // Standalone corrupted characters
  { from: '>�<', to: '>→<' },
  { from: '<span>�</span>', to: '<span>—</span>' },
  { from: 'span>�</', to: 'span>—</' },
  { from: '</span>�', to: '</span>—' },
];

function fixReplacementChars(str) {
  let result = str;
  for (const { from, to } of WORD_REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

const stats = {
  bomFiles: [],
  doubleEncoded: [],
  replacementChars: [],
  jsonFixed: 0,
  jsxFixed: 0,
  bomRemoved: 0,
};

function checkFile(filePath, buffer) {
  const relPath = path.relative(ROOT, filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (hasBom(buffer)) {
    stats.bomFiles.push(relPath);
  }

  const content = buffer.toString('utf8').replace(/^\uFEFF/, '');

  if (hasDoubleEncoded(content)) {
    stats.doubleEncoded.push(relPath);
  }

  const replCount = (content.match(/\uFFFD/g) || []).length;
  if (replCount > 0) {
    stats.replacementChars.push({ file: relPath, count: replCount });
  }
}

// ---------------------------------------------------------------------------
// Fix
// ---------------------------------------------------------------------------

function fixBom(filePath, buffer) {
  if (!hasBom(buffer)) return false;
  const content = buffer.slice(3).toString('utf8');
  fs.writeFileSync(filePath, content, 'utf8');
  stats.bomRemoved++;
  return true;
}

function fixJsonFile(filePath, buffer) {
  const hadBom = hasBom(buffer);
  if (hadBom) stats.bomRemoved++;

  let content = buffer.toString('utf8').replace(/^\uFEFF/, '');
  let changed = false;

  try {
    const data = JSON.parse(content);

    // Walk and fix all string values
    function fixObj(obj) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          if (hasDoubleEncoded(value)) {
            const fixed = fixDoubleEncoding(value);
            if (fixed !== value) {
              obj[key] = fixed;
              changed = true;
            }
          }
          if (value.includes('\uFFFD')) {
            const fixed = fixReplacementChars(value);
            if (fixed !== value) {
              obj[key] = fixed;
              changed = true;
            }
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          fixObj(value);
        }
      }
    }
    fixObj(data);

    if (changed || hadBom) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      if (changed) stats.jsonFixed++;
    }
  } catch (e) {
    // Not valid JSON (e.g., JSONC files like jsconfig.json) — just strip BOM
    if (hadBom) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  [FIX] Removed BOM from ${path.relative(ROOT, filePath)} (JSONC/non-strict JSON)`);
    } else {
      console.log(`  [WARN] Could not parse ${path.relative(ROOT, filePath)}: ${e.message}`);
    }
  }

  return changed || hadBom;
}

function fixJsxFile(filePath, buffer) {
  let content = buffer.toString('utf8');
  let hadBom = hasBom(buffer);
  let changed = false;

  if (hadBom) {
    content = content.slice(1); // remove BOM character
    stats.bomRemoved++;
    changed = true;
  }

  if (hasDoubleEncoded(content)) {
    content = fixDoubleEncoding(content);
    changed = true;
    stats.jsxFixed++;
  }

  if (content.includes('\uFFFD')) {
    const fixed = fixReplacementChars(content);
    if (fixed !== content) {
      content = fixed;
      changed = true;
      stats.jsxFixed++;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return changed;
}

function walkAndFix(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkAndFix(fullPath);
      }
    } else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      const buffer = fs.readFileSync(fullPath);
      checkFile(fullPath, buffer);

      if (fixMode) {
        const ext = path.extname(fullPath).toLowerCase();
        if (ext === '.json') {
          fixJsonFile(fullPath, buffer);
        } else {
          fixJsxFile(fullPath, buffer);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

for (const app of ['admin', 'store', 'marketing', 'backend']) {
  console.log(`\n${app.toUpperCase()}`);
  console.log('─'.repeat(40));

  const appPath = path.join(ROOT, app);
  const beforeStats = {
    bom: stats.bomFiles.length,
    double: stats.doubleEncoded.length,
    repl: stats.replacementChars.length,
  };

  // Check existing files for current state
  walkAndFix(appPath);

  // Report
  const appBom = stats.bomFiles.filter(f => f.startsWith(app)).length;
  const appDouble = stats.doubleEncoded.filter(f => f.startsWith(app)).length;
  const appRepl = stats.replacementChars.filter(f => f.file.startsWith(app)).length;

  console.log(`  BOM files: ${appBom}`);
  console.log(`  Double-encoded files: ${appDouble}`);
  console.log(`  Replacement char files: ${appRepl}`);

  if (appBom > 0) {
    stats.bomFiles.filter(f => f.startsWith(app)).slice(0, 5).forEach(f =>
      console.log(`    ${f}`)
    );
    if (appBom > 5) console.log(`    ... and ${appBom - 5} more`);
  }

  if (appDouble > 0) {
    stats.doubleEncoded.filter(f => f.startsWith(app)).slice(0, 5).forEach(f =>
      console.log(`    ${f}`)
    );
    if (appDouble > 5) console.log(`    ... and ${appDouble - 5} more`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Summary:');
console.log(`  BOM files: ${stats.bomFiles.length}`);
console.log(`  Double-encoded files: ${stats.doubleEncoded.length}`);
console.log(`  Replacement char files: ${stats.replacementChars.length}`);
if (fixMode) {
  console.log(`  BOM removed: ${stats.bomRemoved}`);
  console.log(`  JSON fixed: ${stats.jsonFixed}`);
  console.log(`  JSX fixed: ${stats.jsxFixed}`);
  console.log('\n  Re-run without --fix to verify.');
} else {
  console.log('\n  Run with --fix to automatically repair.');
}
console.log('='.repeat(60));
