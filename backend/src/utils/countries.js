// Seed data for the `countries` collection (models/Country.js), generated
// from the "world-countries" npm package. Stable ids let other seeds (e.g.
// GeneralSettings.countryId) reference a specific country deterministically.
const worldCountries = require("world-countries");

const countries = worldCountries
  .map((country, index) => ({
    _id: `64d0${String(index + 1).padStart(20, "0")}`,
    name: country.name.common,
    iso2: country.cca2,
    iso3: country.cca3,
    region: country.region,
    flag: country.flag,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

module.exports = countries;
