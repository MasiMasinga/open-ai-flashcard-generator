const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const PORT = 5005;
const OpenAI = require("openai");

require("dotenv").config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(bodyParser.json());
app.use(cors());

app.post("/api", async (req, res) => {
    try {
        // const textContent = `
        //     Photosynthesis is the process by which plants use sunlight to synthesize foods from carbon dioxide and water. The process generally involves the green pigment chlorophyll and generates oxygen as a by-product.
        // `;

        const { textContent } = req.body;

        const medicineKeywords = [
            "patient",
            "medicine",
            "health",
            "doctor",
            "nurse",
            "patient",
            "disease",
            "treatment",
            "diagnosis",
            "pharmaceutical",
            "surgery",
            "physiology",
            "anatomy",
            "medication",
            "pediatrics",
            "neurology",
            "cardiology",
            "oncology",
            "psychology",
        ];

        const containsMedicineKeywords = medicineKeywords.some((keyword) =>
            textContent.toLowerCase().includes(keyword)
        );

        if (!containsMedicineKeywords) {
            return res.status(400).json({
                message:
                    "I'm not trained to generate questions on that topic. Please provide medicine-related content.",
            });
        }

        const prompt = `
        Given the following text:

        ${textContent}

        Generate at least 5 multiple-choice questions with 4 answer options each. Ensure that one answer is correct and the others are plausible but incorrect. The output format should be:
        Question: <Question text>
        Options: 
        1. <Option 1>
        2. <Option 2>
        3. <Option 3>
        4. <Option 4>
        Correct Answer: <The correct option number>
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.7,
        });

        const flashcardOutput = response.choices[0].message.content.trim();

        const questionBlocks = flashcardOutput.split(/\n\s*\n/);
        const structuredQuestions = questionBlocks.map((block) => {
            const questionRegex = /Question:\s*(.*)/;
            const optionsRegex = /Options:\s*([\s\S]*?)\s*Correct Answer:/;
            const correctAnswerRegex = /Correct Answer:\s*(.*)/;

            const questionMatch = block.match(questionRegex);
            const optionsMatch = block.match(optionsRegex);
            const correctAnswerMatch = block.match(correctAnswerRegex);

            const question = questionMatch ? questionMatch[1].trim() : "";
            const options = optionsMatch
                ? optionsMatch[1]
                      .trim()
                      .split("\n")
                      .reduce((acc, option) => {
                          const [key, value] = option
                              .split(".")
                              .map((part) => part.trim());
                          acc[key] = value;
                          return acc;
                      }, {})
                : {};
            const correctAnswer = correctAnswerMatch
                ? correctAnswerMatch[1].trim()
                : "";

            return {
                question,
                options,
                correctAnswer,
            };
        });

        res.json(structuredQuestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate flashcards." });
    }
});

app.listen(PORT, () => {
    console.log("4MM Test Server");
    console.log(`🚀 Server Started on PORT ${PORT}`);
});
