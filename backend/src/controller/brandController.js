const BrandService = require("../service/BrandService");
const { resolveStoreId } = require("../utils/requestContext");

const DUPLICATE_FIELD_RESPONSES = {
  name: { message: "Brand name already exists!", code: "BRAND_NAME_EXISTS" },
  slug: { message: "Brand slug already exists!", code: "BRAND_SLUG_EXISTS" },
};

const getDuplicateKeyResponse = (err) => {
  if (err?.code !== 11000) return null;
  const field = Object.keys(err?.keyPattern || {})[0];
  return DUPLICATE_FIELD_RESPONSES[field] || null;
};

const addBrand = async (req, res) => {
  try {
    const newBrand = await BrandService.createBrand({ ...req.body, storeId: resolveStoreId(req) });
    res.status(200).send(newBrand);
  } catch (err) {
    const duplicateResponse = getDuplicateKeyResponse(err);
    if (duplicateResponse) {
      return res.status(409).send(duplicateResponse);
    }
    res.status(500).send({
      message: `Error occur when adding brand ${err.message}`,
    });
  }
};

const addAllBrands = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const brands = Array.isArray(req.body) ? req.body : req.body?.brands;
    if (!Array.isArray(brands) || brands.length === 0) {
      return res.status(400).send({ message: "No valid brands found in the uploaded file!" });
    }

    const docs = brands
      .filter((b) => b && b.name)
      .map((b) => ({
        name: b.name,
        slug: b.slug || undefined,
        description: b.description || "",
        website: b.website || "",
        logo: b.logo || "",
        status: b.status === undefined ? true : b.status === "true" || b.status === true,
        storeId,
      }));

    let insertedCount = 0;
    try {
      const inserted = await BrandService.insertManyBrands(docs);
      insertedCount = inserted.length;
    } catch (bulkErr) {
      insertedCount = bulkErr?.insertedDocs?.length || 0;
      if (!insertedCount) throw bulkErr;
    }

    res.status(200).send({
      message: `${insertedCount} of ${docs.length} brand(s) imported successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllBrands = async (req, res) => {
  try {
    const result = await BrandService.getAllBrands({ ...req.query, storeId: req.authContext?.storeId });
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getBrandById = async (req, res) => {
  try {
    const brand = await BrandService.getBrandById(req.params.id, req.authContext?.storeId);
    if (!brand) {
      return res.status(404).send({ message: "Brand Not Found!" });
    }
    res.send(brand);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateBrand = async (req, res) => {
  try {
    const brand = await BrandService.updateBrand(req.params.id, req.body, req.authContext?.storeId);

    if (brand) {
      res.send({ data: brand, message: "Brand updated successfully!" });
    } else {
      res.status(404).send({
        message: "Brand Not Found!",
      });
    }
  } catch (err) {
    const duplicateResponse = getDuplicateKeyResponse(err);
    if (duplicateResponse) {
      return res.status(409).send(duplicateResponse);
    }
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const brand = await BrandService.deleteBrand(req.params.id, req.authContext?.storeId);
    if (!brand) {
      return res.status(404).send({ message: "Brand Not Found!" });
    }
    res.send({
      message: "Brand Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addBrand,
  addAllBrands,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
