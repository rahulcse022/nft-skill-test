const express = require("express");
const { ethers } = require("ethers");
const { tokenABI } = require("./ABI/tokenABI");
require("dotenv").config();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

// Create an express app
const app = express();
const PORT = process.env.PORT || 3000;

// Use Helmet for setting secure HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Rate limiter: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

app.use(limiter);

// Set up the provider with the BSC Testnet provider
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

// Define an endpoint to get the token details
app.get("/token-details", async (req, res) => {
  const { contractAddress } = req.query;

  if (!contractAddress) {
    return res.status(400).json({
      status: "error",
      message: "contractAddress is required",
    });
  }

  // Validate contract address (Ethereum address)
  if (!ethers.utils.isAddress(contractAddress)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid contractAddress provided",
    });
  }

  try {
    // Create a contract instance
    const tokenContract = new ethers.Contract(
      contractAddress,
      tokenABI,
      provider
    );

    // Fetch the token details
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply(),
    ]);

    // Send the response with proper formatting and status
    res.status(200).json({
      status: "success",
      data: {
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        totalSupplyWithDecimal: totalSupply.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching token details:", error.message);

    // Return a detailed error response with the right status code
    if (error.code === "CALL_EXCEPTION") {
      return res.status(500).json({
        status: "error",
        message:
          "Contract call failed, possibly due to incorrect contractAddress.",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Internal Server Error. Please try again later.",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
