require("dotenv").config();
const fs = require("fs");

const products = require("../../utils/products");
const logger = require("../config/logger");

const updateManyProducts = async () => {
  try {
    logger.info("process running!");
    const result = products?.map((el) => {
      const newObj = {
        slug: el.slug,
        sku: el.sku,
        barcode: el.barcode,
        productId: el.productId,

        title: el.title,
        description: el.description,
        categories: el.categories,
        category: el.category,
        image: el.image,
        stock: el.stock,
        status: el.status,
        isCombination: el.isCombination,
        prices: {
          discount: "0",
          originalPrice: el.prices.originalPrice,
          price: el.prices.price,
        },
        variants: el.variants,
        tag: el.tag,
      };
      return newObj;
    });

    fs.writeFileSync("data.json", JSON.stringify(result), "utf8");
    logger.info("data updated successfully!", result);
    process.exit();
  } catch (err) {
    logger.error("error", err);
    process.exit(1);
  }
};

updateManyProducts();
