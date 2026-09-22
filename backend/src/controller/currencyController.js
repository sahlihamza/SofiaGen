const Currencie = require("../models/Currency");
const asyncHandler = require("../lib/asyncHandler");

const addCurrency = asyncHandler(async (req, res) => {
  const newCurrency = new Currencie(req.body);
  await newCurrency.save();
  res.send({ message: "Currency added successfully!" });
});

const addAllCurrency = asyncHandler(async (req, res) => {
  await Currencie.insertMany(req.body);
  res.send({ message: "All Currencies added successfully!" });
});

const getAllCurrency = asyncHandler(async (req, res) => {
  const Currencies = await Currencie.find({});
  res.send(Currencies);
});

const getShowingCurrency = asyncHandler(async (req, res) => {
  const currencies = await Currencie.find({ status: "show" }).sort({ _id: -1 });
  res.send(currencies);
});

const getCurrencyById = asyncHandler(async (req, res) => {
  const currency = await Currencie.findById(req.params.id);
  res.send(currency);
});

const updateCurrency = asyncHandler(async (req, res) => {
  const currency = await Currencie.findById(req.params.id);
  if (currency) {
    currency.name = req.body.name;
    currency.symbol = req.body.symbol;
    currency.iso_code = req.body.iso_code;
    currency.exchange_rate = req.body.exchange_rate;
    currency.status = req.body.status;
    currency.live_exchange_rates = req.body.live_exchange_rates;
  }
  await currency.save();
  res.send({ message: "Currency update successfully!" });
});

const updateManyCurrency = asyncHandler(async (req, res) => {
  await Currencie.updateMany(
    { _id: { $in: req.body.ids } },
    { $set: { status: req.body.status, live_exchange_rates: req.body.live_exchange_rates } },
    { multi: true }
  );
  res.send({ message: "Currencies update successfully!" });
});

const updateEnabledStatus = asyncHandler(async (req, res) => {
  await Currencie.updateOne({ _id: req.params.id }, { $set: { status: req.body.status } });
  res.status(200).send({
    message: `Currencie ${req.body.status === "show" ? "Published" : "Un-Published"} Successfully!`,
  });
});

const updateLiveExchangeRateStatus = asyncHandler(async (req, res) => {
  await Currencie.updateOne(
    { _id: req.params.id },
    { $set: { live_exchange_rates: req.body.live_exchange_rates } }
  );
  res.status(200).send({
    message: `Currencie ${req.body.live_exchange_rates === "show" ? "Published" : "Un-Published"} Successfully!`,
  });
});

const deleteCurrency = asyncHandler(async (req, res) => {
  await Currencie.deleteOne({ _id: req.params.id });
  res.send({ message: "Delete currency successfully!" });
});

const deleteManyCurrency = asyncHandler(async (req, res) => {
  await Currencie.deleteMany({ _id: req.body.ids });
  res.send({ message: "currency Delete Successfully!" });
});

module.exports = {
  addCurrency,
  addAllCurrency,
  getAllCurrency,
  getShowingCurrency,
  getCurrencyById,
  updateCurrency,
  updateManyCurrency,
  updateEnabledStatus,
  updateLiveExchangeRateStatus,
  deleteCurrency,
  deleteManyCurrency,
};
