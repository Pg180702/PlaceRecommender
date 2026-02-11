require("dotenv").config();
import express from "express";
import cors from "cors";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: `${process.env.FRONTEND_URL}`,
  }),
);
app.use(express.json());

app.listen(process.env.PORT, () => {
  console.log("Server started");
});
