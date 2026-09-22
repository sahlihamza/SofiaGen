const Country = require("../models/Country");

class CountryService {
  async getAllCountries() {
    return await Country.find({}).sort({ name: 1 });
  }

  async getCountryById(id) {
    return await Country.findById(id);
  }
}

module.exports = new CountryService();
