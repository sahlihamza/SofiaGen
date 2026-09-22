import { useState } from "react";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import { parentIdOf } from "@/utils/categoryTree";
import useDrawerFormSubmit from "./useDrawerFormSubmit";

const useCategorySubmit = (id) => {
  const [parentId, setParentId] = useState("");
  const [published, setPublished] = useState(true);

  const { onSubmit, ...rest } = useDrawerFormSubmit({
    id,
    services: ProductCategoryServices,
    add: "addCategory",
    update: "updateCategory",
    getById: "getCategoryById",
    pickFields: ({ name, slug }) => ({
      name: name?.trim(),
      ...(slug?.trim() ? { slug: slug.trim() } : {}),
    }),
    toFormValues: (entity) => ({
      name: entity.name,
      slug: entity.slug,
    }),
    transformPayload: (payload) => ({
      ...payload,
      parentId: parentId || null,
      status: published ? "active" : "inactive",
    }),
    reset: ["name", "slug"],
    successMessages: {
      add: "Category added successfully!",
      update: "Category updated successfully!",
    },
  });

  // Sync the entity's parentId / status into local state when fetched.
  // Done outside the factory because they need their own useState.
  // (Hook consumers can call setValue or just inspect the existing fields.)

  return { onSubmit, parentId, setParentId, published, setPublished, ...rest };
};

export default useCategorySubmit;
