require("dotenv").config();

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
}

const initDB = async () => {
    await Listing.deleteMany({});

    let seedUser = await User.findOne({ username: "demo_user" });

    if (!seedUser) {
        seedUser = await User.register(
            new User({
                username: "demo_user",
                email: "demo@example.com"
            }),
            "DemoPassword123"
        );
    }

    initData.data = initData.data.map((obj) => ({
        ...obj,
        owner: seedUser._id
    }));

    await Listing.insertMany(initData.data);

    console.log("data was initialized");
};

initDB();