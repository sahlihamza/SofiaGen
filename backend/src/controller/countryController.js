const countryService = require("../service/countryService");

const getCountries = async (req, res) => {
  try {
    const countries = await countryService.getAllCountries();
    return res.status(200).json({
      success: true,
      message: "Liste des pays récupéré avec succès",
      data: countries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await countryService.getCountryById(id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays introuvable",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pays récupéré avec succès",
      data: country,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Identifiant invalide",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  getCountries,
  getCountryById,
};
