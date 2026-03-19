import { getCatalogImageUrl, getCatalogImageUrls } from "./storage-service.js";

export const IMAGE_TRANSFORMS = {
  catalogCard: {
    width: 140,
    height: 140,
    quality: 70,
    resize: "contain"
  },
  productDetail: {
    width: 720,
    height: 720,
    quality: 82,
    resize: "contain"
  }
};

export function getImageUrl(path, options = null) {
  return getCatalogImageUrl(path, options);
}

export function getImageUrls(path, options = null) {
  return getCatalogImageUrls(path, options);
}

export function getCatalogCardImageUrl(path) {
  return getImageUrl(path, IMAGE_TRANSFORMS.catalogCard);
}

export function getProductDetailImageUrl(path) {
  return getImageUrl(path, IMAGE_TRANSFORMS.productDetail);
}

export function getCatalogCardImageUrls(path) {
  return getImageUrls(path, IMAGE_TRANSFORMS.catalogCard);
}

export function getProductDetailImageUrls(path) {
  return getImageUrls(path, IMAGE_TRANSFORMS.productDetail);
}
