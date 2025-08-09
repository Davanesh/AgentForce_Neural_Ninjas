import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";
import { getAIReview, postPRComment } from "./reviewAgent.js";

dotenv.config();

const app = express();

const GITHUB_SECRET = process.env.GITHUB_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Signature verification
function verifySignature(req, buf) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
  hmac.update(buf);
  const expected = `sha256=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// Middleware to verify GitHub webhook requests
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      if (!verifySignature(req, buf)) {
        console.warn("⚠️ Invalid GitHub webhook signature");
        throw new Error("Invalid signature");
      }
    },
  })
);

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  const event = req.headers["x-github-event"];

  if (event === "pull_request" && req.body.action === "opened") {
    try {
      const { pull_request, repository } = req.body;

      const owner = repository.owner.login;
      const repo = repository.name;
      const pullNumber = pull_request.number;

      // Fetch diff
      const diffRes = await axios.get(pull_request.diff_url, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
      });
      const diff = diffRes.data;

      // Get AI review
      const aiReview = await getAIReview(
        diff,
        pull_request.title,
        pull_request.body
      );

      // Post comment to PR
      await postPRComment(owner, repo, pullNumber, aiReview);

      console.log(`✅ Posted AI review on PR #${pullNumber}`);
      res.status(200).send("Review posted!");
    } catch (err) {
      console.error("❌ Error handling PR:", err.message);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(200).send("Event ignored");
  } 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
