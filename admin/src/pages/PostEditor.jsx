import { EditorState, convertToRaw } from "draft-js";
import { stateFromHTML } from "draft-js-import-html";
import draftToHtml from "draftjs-to-html";
import { Editor } from "react-draft-wysiwyg";
import { Card, CardBody, Input, Select } from "@windmill/react-ui";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiX } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import Uploader from "@/components/image-uploader/Uploader";
import PostServices from "@/services/PostServices";
import PostCategoryServices from "@/services/PostCategoryServices";
import PostTagServices from "@/services/PostTagServices";
import { uploadImages } from "@/utils/uploadImage";
import { notifyError, notifySuccess } from "@/utils/toast";

import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Button } from "@sofia/ui";

const createEditorState = (html) => EditorState.createWithContent(stateFromHTML(html || ""));

const PostEditor = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [editorState, setEditorState] = useState(() => createEditorState(""));
  const [featuredImage, setFeaturedImage] = useState("");
  const [gallery, setGallery] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);

  const [status, setStatus] = useState("draft");
  const [visibility, setVisibility] = useState("public");
  const [password, setPassword] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sticky, setSticky] = useState(false);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImage, setOgImage] = useState("");

  useEffect(() => {
    PostCategoryServices.getAllPostCategories({}).then((res) => setCategoryOptions(res?.data || []));
    PostTagServices.getAllPostTags({}).then((res) => setTagOptions(res?.data || []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    PostServices.getPostById(id)
      .then((res) => {
        const post = res?.data;
        if (!post) return;
        setTitle(post.title || "");
        setSlug(post.slug || "");
        setSlugTouched(true);
        setExcerpt(post.excerpt || "");
        setEditorState(createEditorState(post.content || ""));
        setFeaturedImage(post.featuredImage || "");
        setGallery(post.gallery || []);
        setCategories((post.categories || []).map((c) => c._id || c));
        setTags((post.tags || []).map((tg) => tg._id || tg));
        setStatus(post.status || "draft");
        setVisibility(post.visibility || "public");
        setScheduledAt(post.scheduledAt ? post.scheduledAt.slice(0, 16) : "");
        setAllowComments(post.allowComments ?? true);
        setFeatured(post.featured ?? false);
        setSticky(post.sticky ?? false);
        setMetaTitle(post.seo?.metaTitle || "");
        setMetaDescription(post.seo?.metaDescription || "");
        setCanonicalUrl(post.seo?.canonicalUrl || "");
        setOgImage(post.seo?.ogImage || "");
      })
      .catch((err) => notifyError(err?.response?.data?.message || err?.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Auto-suggest a slug from the title until the user edits the slug field
  // by hand â€” mirrors the backend's own slugify, just for live preview;

  // the backend is still the source of truth for uniqueness.
  useEffect(() => {
    if (slugTouched) return;
    setSlug(
      title
        .normalize("NFD")
        .replace(/[Ì€-Í¯]/g, "")

        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  }, [title, slugTouched]);

  const toggleCategory = (categoryId) => {
    setCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleTag = (tagId) => {
    setTags((prev) => (prev.includes(tagId) ? prev.filter((tg) => tg !== tagId) : [...prev, tagId]));
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setGalleryUploading(true);
      const urls = await uploadImages(files, { folder: "post" });
      setGallery((prev) => [...prev, ...urls]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const removeGalleryImage = (url) => {
    setGallery((prev) => prev.filter((img) => img !== url));
  };

  const buildPayload = (overrideStatus) => ({
    title,
    slug: slugTouched ? slug : undefined,
    excerpt,
    content: draftToHtml(convertToRaw(editorState.getCurrentContent())),
    featuredImage,
    gallery,
    categories,
    tags,
    status: overrideStatus || status,
    visibility,
    password: visibility === "password" ? password : undefined,
    scheduledAt: scheduledAt || undefined,
    allowComments,
    featured,
    sticky,
    seo: {
      metaTitle,
      metaDescription,
      canonicalUrl,
      ogImage,
    },
  });

  const handleSave = async (overrideStatus) => {
    if (!title.trim()) {
      setTitleError(t("PostTitleRequired"));
      return;
    }
    setTitleError("");
    try {
      setSubmitting(true);
      const payload = buildPayload(overrideStatus);
      if (isEdit) {
        await PostServices.updatePost(id, payload);
        notifySuccess(t("PostUpdateSuccess"));
      } else {
        const res = await PostServices.addPost(payload);
        notifySuccess(t("PostAddSuccess"));
        history.replace(`/posts/${res?.data?._id}/edit`);
        setSubmitting(false);
        return;
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageTitle>{isEdit ? t("EditPostPageTitle") : t("AddNewPost")}</PageTitle>

      <AnimatedContent>
        <div className="flex justify-end -mt-4 mb-4">
          <Button
            type="button"
            onClick={() => history.push("/posts")}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors flex-shrink-0"
          >
            <FiArrowLeft size={16} /> {t("BackToPosts")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t("PostTitleLabel")} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError("");
                  }}
                  type="text"
                  placeholder={t("PostTitlePlaceholder")}
                  className={titleError ? "mb-1 border-red-500" : "mb-4"}
                />
                {titleError && <p className="text-red-500 text-sm mb-4">{titleError}</p>}

                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t("PostSlugLabel")}
                </label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  type="text"
                  placeholder={t("PostSlugPlaceholder")}
                  className="mb-4"
                />

                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t("PostExcerptLabel")}
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  placeholder={t("PostExcerptPlaceholder")}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md p-3 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </CardBody>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t("PostContentLabel")}
                </label>
                <Editor
                  editorState={editorState}
                  wrapperClassName="demo-wrapper"
                  editorClassName="demo-editor"
                  onEditorStateChange={setEditorState}
                  editorStyle={{ border: "1px solid #F1F1F1", padding: "0 15px", minHeight: 320 }}
                  toolbar={{
                    options: [
                      "inline",
                      "blockType",
                      "fontSize",
                      "list",
                      "textAlign",
                      "colorPicker",
                      "link",
                      "embedded",
                      "image",
                      "remove",
                      "history",
                    ],
                    embedded: { defaultSize: { height: "auto", width: "100%" } },
                  }}
                />
              </CardBody>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <h4 className="font-medium text-base text-gray-800 dark:text-gray-300 mb-4">
                  {t("PostSeoSectionTitle")}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t("PostSeoMetaTitle")}
                    </label>
                    <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} type="text" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t("PostSeoMetaDescription")}
                    </label>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md p-3 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t("PostSeoCanonicalUrl")}
                    </label>
                    <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} type="text" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {t("PostSeoOgImage")}
                    </label>
                    <Uploader imageUrl={ogImage} setImageUrl={setOgImage} folder="post" targetWidth={1200} targetHeight={630} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t("PostStatusLabel")}
                </label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4">
                  <option value="draft">{t("PostStatusDraft")}</option>
                  <option value="pending">{t("PostStatusPending")}</option>
                  <option value="published">{t("PostStatusPublished")}</option>
                  <option value="private">{t("PostStatusPrivate")}</option>
                  <option value="archived">{t("PostStatusArchived")}</option>
                </Select>

                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t("PostVisibilityLabel")}
                </label>
                <Select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="mb-4">
                  <option value="public">{t("PostVisibilityPublic")}</option>
                  <option value="private">{t("PostVisibilityPrivate")}</option>
                  <option value="password">{t("PostVisibilityPassword")}</option>
                </Select>

                {visibility === "password" && (
                  <div className="mb-4">
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t("PostPasswordLabel")}
                    </label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} type="text" />
                  </div>
                )}

                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {t("PostScheduledAtLabel")}
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md p-2.5 mb-4 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} />
                    {t("PostAllowCommentsLabel")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                    {t("PostFeaturedLabel")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={sticky} onChange={(e) => setSticky(e.target.checked)} />
                    {t("PostStickyLabel")}
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <Button type="button" disabled={submitting} onClick={() => handleSave("draft")} layout="outline" className="h-11 w-full dark:bg-gray-700">
                    <span className="text-black dark:text-gray-200">{t("SaveDraftBtn")}</span>
                  </Button>
                  <Button type="button" disabled={submitting} onClick={() => handleSave("published")} className="h-11 w-full">
                    {t("PublishBtn")}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t("PostFeaturedImageLabel")}
                </label>
                <Uploader imageUrl={featuredImage} setImageUrl={setFeaturedImage} folder="post" targetWidth={1200} targetHeight={800} />
              </CardBody>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t("PostGalleryLabel")}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {gallery.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="w-16 h-16 rounded object-cover border border-gray-100 dark:border-gray-700" />
                      <Button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="absolute -top-1.5 -right-1.5 bg-white dark:bg-gray-800 rounded-full text-red-500 shadow"
                      >
                        <FiX size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  className="hidden"
                  id="post-gallery-input"
                />
                <label
                  htmlFor="post-gallery-input"
                  className="flex items-center justify-center gap-2 h-10 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-md cursor-pointer text-gray-500 hover:border-emerald-500 hover:text-emerald-600"
                >
                  <FiPlus size={14} />
                  {galleryUploading ? t("UploadingText") : t("PostAddGalleryImages")}
                </label>
              </CardBody>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardBody>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t("PostCategoriesPageTitle")}
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 mb-4">
                  {categoryOptions.map((cat) => (
                    <label key={cat._id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={categories.includes(cat._id)}
                        onChange={() => toggleCategory(cat._id)}
                      />
                      {cat.name}
                    </label>
                  ))}
                  {categoryOptions.length === 0 && (
                    <p className="text-xs text-gray-400">{t("NoPostCategoriesRightNow")}</p>
                  )}
                </div>

                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t("PostTagsPageTitle")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => {
                    const active = tags.includes(tag._id);
                    return (
                      <Button
                        key={tag._id}
                        type="button"
                        onClick={() => toggleTag(tag._id)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                        style={
                          active
                            ? { backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }
                            : { borderColor: "#e5e7eb", color: "#9ca3af" }
                        }
                      >
                        {tag.name}
                      </Button>
                    );
                  })}
                  {tagOptions.length === 0 && <p className="text-xs text-gray-400">{t("NoPostTagsRightNow")}</p>}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </AnimatedContent>
    </>
  );
};

export default PostEditor;
