import axios from "axios";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export const callGooglePlacesApi = async ({
  url,
  method = "POST",
  data,
  params,
  fieldMask,
  retries = 2,
  retryDelayMs = 800,
}) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY");

  let attempt = 0;

  while (true) {
    try {
      const response = await axios({
        url,
        method,
        data,
        params,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
        },
      });

      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      const shouldRetry = RETRYABLE_STATUS.has(status) && attempt < retries;

      if (!shouldRetry) {
        const message =
          error?.response?.data?.error?.message ||
          error.message ||
          "Unknown API error";
        throw new Error(
          `Google Places API failed (${status ?? "no-status"}): ${message}`,
        );
      }

      attempt += 1;
      await sleep(retryDelayMs * 2 ** (attempt - 1));
    }
  }
};

export const inferCuisines = (types, name) => {
  const typeMapping = {
    indian_restaurant: "North Indian",
    south_indian_restaurant: "South Indian",
    chinese_restaurant: "Chinese",
    italian_restaurant: "Italian",
    mexican_restaurant: "Mexican",
    japanese_restaurant: "Japanese",
    thai_restaurant: "Thai",
    korean_restaurant: "Korean",
    cafe: "Cafe",
    bar: "Bar",
    bakery: "Bakery",
    ice_cream_shop: "Ice Cream",
    dessert_shop: "Dessert",
    fast_food_restaurant: "Fast Food",
    pizza_restaurant: "Pizza",
    seafood_restaurant: "Seafood",
    vegetarian_restaurant: "Vegetarian",
    vegan_restaurant: "Vegan",
    restaurant: "Restaurant",
  };

  const cuisines = [];

  if (types && Array.isArray(types)) {
    for (const type of types) {
      if (typeMapping[type]) {
        cuisines.push(typeMapping[type]);
      }
    }
  }

  const nameLower = (name || "").toLowerCase();

  if (
    cuisines.length === 0 ||
    (cuisines.length === 1 && cuisines[0] === "Restaurant")
  ) {
    if (nameLower.includes("biryani")) cuisines.push("Biryani");
    if (nameLower.includes("dhaba")) {
      cuisines.push("North Indian");
      cuisines.push("Dhaba");
    }
    if (nameLower.includes("sweet") || nameLower.includes("mithai")) {
      cuisines.push("Sweet Shop");
    }
    if (nameLower.includes("tandoor")) cuisines.push("North Indian");
    if (nameLower.includes("dosa") || nameLower.includes("idli")) {
      cuisines.push("South Indian");
    }
    if (nameLower.includes("pizza")) cuisines.push("Pizza");
    if (nameLower.includes("burger")) cuisines.push("Burgers");
    if (nameLower.includes("chinese") || nameLower.includes("chaufa")) {
      cuisines.push("Chinese");
    }
    if (nameLower.includes("pasta") || nameLower.includes("italian")) {
      cuisines.push("Italian");
    }
    if (nameLower.includes("momos")) {
      cuisines.push("Chinese");
      cuisines.push("Street Food");
    }
    if (nameLower.includes("chaat")) cuisines.push("Street Food");
    if (nameLower.includes("thali")) cuisines.push("North Indian");
    if (nameLower.includes("paratha")) cuisines.push("North Indian");
  }

  const uniqueCuisines = [...new Set(cuisines)];
  return uniqueCuisines.length > 0 ? uniqueCuisines : ["Restaurant"];
};

export const getPhotoUrl = (photoName) => {
  if (!photoName) return null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`;
};
