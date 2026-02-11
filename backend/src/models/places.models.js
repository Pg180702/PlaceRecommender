import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    googlePlaceId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    cuisines: [String],
    priceLevel: { type: Number, required: true },
    rating: Number,
    totalRatings: Number,
    address: { type: String, required: true },
    photoUrl: String,
    timings: {
      openingTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
      closingTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: "Coordinates must be [longitude, latitude]",
        },
      },
      reviews: [
        {
          text: String,
          rating: Number,
          authorName: String,
        },
      ],
    },
  },
  { timestamps: true },
);

export const Place = mongoose.model("Place", placeSchema);
