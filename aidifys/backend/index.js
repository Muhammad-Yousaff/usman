require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const multer = require('multer');
const moment = require("moment");
const path = require('path');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const prerender = require('prerender-node');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const dns = require('dns');

// Use Google's public DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const port = process.env.PORT || 5000;


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });

};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
prerender.set('prerenderToken', '');
app.use(express.json());
app.use(cors());
app.use(prerender);
// Multer configuration for file uploads saved to 'uploads' directory (use system temp dir on Vercel)
const os = require('os');
const uploadDir = process.env.VERCEL ? os.tmpdir() : 'uploads/';
const upload = multer({ dest: uploadDir });
// (Optional) memory storage for other uses
const storage = multer.memoryStorage();
const imageUpload = multer({ storage: storage });
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));
const logoUrl = "";

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.DATABASE_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// const transporter = nodemailer.createTransport({
//   service: 'Gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

async function run() {
  try {
    await client.connect();
    const db = client.db("MenJobPortal");
    const jobsCollections = db.collection("demoJobs");
    const usersCollection = db.collection("users");
    const jobApplicationsCollection = db.collection("jobApplications");
    const otpCollection = db.collection("otp");
    const blogsCollection = db.collection("blogs");
    const subscribersCollection = db.collection("subscribers");
    const SUPER_ADMIN_EMAIL = "usama.mang0901@gmail.com";


    async function generateUniqueSlug(jobTitle, existingId = null) {
      let baseSlug = jobTitle
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

      let uniqueSlug = baseSlug;
      let counter = 1;

      while (true) {
        const existingJob = await jobsCollections.findOne({
          slug: uniqueSlug,
          _id: { $ne: existingId ? new ObjectId(existingId) : null },
        });

        if (!existingJob) break;

        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      return uniqueSlug;
    }
    app.post("/post-job", upload.single('image'), async (req, res) => {
  try {
    let body = req.body;

    // If the request is sent as FormData, body may be under .data
    if (body.data) {
      body = body.data;
    }
      // Attach uploaded image URL if present
      if (req.file) {
        body.image = `/uploads/${req.file.filename}`; // store path for frontend
      }

        if (!body.companyName || !body.jobTitle || !body.useremail) {
          return res.status(400).send({
            message: "Company Name, Job Title, and User Email are required.",
            status: false
          });
        }

        body.createdAt = new Date();
        body.superAdminEmail = SUPER_ADMIN_EMAIL;

        body.slug = await generateUniqueSlug(body.jobTitle);

        let companyId = body.companyName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '');
        body.companyId = companyId;

          const result = await jobsCollections.insertOne(body);
          const insertedJob = { ...body, _id: result.insertedId };
          console.log('Job inserted:', insertedJob);
          return res.status(201).json({
            message: "Job created successfully!",
            job: insertedJob,
            status: true
          });
      } catch (error) {
        console.error(error);
        return res.status(500).send({
          message: "Internal Server Error",
          status: false
        });
      }
    });

    app.post("/update-job", async (req, res) => {
      try {
        let body = req.body;

        if (body.data) {
          body = body.data;
        }

        if (!body._id) {
          return res.status(400).send({
            message: "Job ID is required for updating.",
            status: false
          });
        }

        body._id = new ObjectId(body._id);
        body.updatedAt = new Date();
        body.superAdminEmail = body.superAdminEmail || "usama.mang0901@gmail.com";

        if (body.jobTitle) {
          body.slug = await generateUniqueSlug(body.jobTitle, body._id);
        }

        const result = await jobsCollections.findOneAndUpdate(
          { _id: body._id },
          { $set: body },
          { returnOriginal: false, upsert: false }
        );

        if (result) {
          return res.status(200).send({
            message: "Job updated successfully!",
            job: result,
            status: true
          });
        } else {
          return res.status(404).send({
            message: "Job not found!",
            status: false
          });
        }
      } catch (error) {
        console.error(error);
        return res.status(500).send({
          message: "Internal Server Error",
          status: false
        });
      }
    });
 // get All Jobs ////
    app.get("/all-jobs", async (req, res) => {
      try {
        const jobs = await jobsCollections.find({}).toArray();
        res.send(jobs);
      } catch (error) {
        console.error(error);
        return res.status(500).send({
          message: "Internal Server Error",
          status: false
        });
      }
    });

 
    

    // app.get("/all-jobs", async (req, res) => {
    //   try {
    //     // Get query parameters for pagination
    //     const { page = 1, limit = 10 } = req.query;

    //     // Convert page and limit to numbers
    //     const pageNum = parseInt(page);
    //     const limitNum = parseInt(limit);

    //     // Calculate the number of jobs to skip
    //     const skip = (pageNum - 1) * limitNum;

    //     // Fetch paginated jobs sorted by `createdAt` in descending order
    //     const jobsPromise = jobsCollections
    //       .find({})
    //       .sort({ createdAt: -1 }) // Sort by latest jobs first
    //       .skip(skip)
    //       .limit(limitNum)
    //       .toArray();

    //     // Fetch counts for categories and locations
    //     const categoryCountsPromise = jobsCollections
    //       .aggregate([
    //         { $group: { _id: "$category", count: { $sum: 1 } } }
    //       ])
    //       .toArray();

    //     const locationCountsPromise = jobsCollections
    //       .aggregate([
    //         { $group: { _id: "$jobLocation", count: { $sum: 1 } } }
    //       ])
    //       .toArray();

    //     // Fetch total job count for pagination
    //     const totalJobsPromise = jobsCollections.countDocuments();

    //     // Await all promises
    //     const [jobs, categoryCounts, locationCounts, totalJobs] = await Promise.all([
    //       jobsPromise,
    //       categoryCountsPromise,
    //       locationCountsPromise,
    //       totalJobsPromise
    //     ]);

    //     // Send the response
    //     res.send({
    //       status: true,
    //       data: {
    //         jobs,
    //         totalJobs,
    //         currentPage: pageNum,
    //         totalPages: Math.ceil(totalJobs / limitNum),
    //         categoryCounts,
    //         locationCounts,
    //       },
    //     });
    //   } catch (error) {
    //     console.error(error);
    //     return res.status(500).send({
    //       message: "Internal Server Error",
    //       status: false,
    //     });
    //   }
    // });

    app.get("/company-jobs/:companyId", async (req, res) => {
      const companyId = req.params.companyId;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      try {
        const jobs = await jobsCollections
          .find({ companyId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalJobs = await jobsCollections.countDocuments({ companyId });
        const totalPages = Math.ceil(totalJobs / limit);

        res.json({
          jobs,
          totalPages,
          currentPage: page,
          totalJobs,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.get("/location-jobs/:jobLocation", async (req, res) => {
      const jobLocation = req.params.jobLocation;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      try {
        const jobs = await jobsCollections
          .find({ jobLocation })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalJobs = await jobsCollections.countDocuments({ jobLocation });
        const totalPages = Math.ceil(totalJobs / limit);

        res.json({
          jobs,
          totalPages,
          currentPage: page,
          totalJobs,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    app.get("/categories/:category", async (req, res) => {
      const category = req.params.category;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      try {
        const jobs = await jobsCollections
          .find({ category })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalJobs = await jobsCollections.countDocuments({ category });
        const totalPages = Math.ceil(totalJobs / limit);

        res.json({
          jobs,
          totalPages,
          currentPage: page,
          totalJobs,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.get("/job/:slug", async (req, res) => {
      const slug = req.params.slug;

      try {
        const job = await jobsCollections.findOne({ slug: slug });
        if (!job) {
          return res.status(404).send({ message: 'Job not found' });
        }
        res.json(job);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.get("/myJobs/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const dateRange = req.query.dateRange || "all";
        let startDate = null;
        let endDate = null;

        if (dateRange !== "all") {
          const match = dateRange.match(/^(\d+)-months?$/);
          if (match) {
            const monthsCount = parseInt(match[1]);
            startDate = moment().subtract(monthsCount, "months").toDate();
            endDate = moment().toDate();
          }
        }

        let jobs;
        let totalJobs;

        if (userEmail === SUPER_ADMIN_EMAIL) {
          const query = {};
          if (startDate && endDate) {
            query.createdAt = { $gte: startDate, $lt: endDate };
          }

          totalJobs = await jobsCollections.countDocuments(query);
          jobs = await jobsCollections
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        } else {
          const query = { useremail: userEmail };
          if (startDate && endDate) {
            query.createdAt = { $gte: startDate, $lt: endDate };
          }

          totalJobs = await jobsCollections.countDocuments(query);
          jobs = await jobsCollections
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        }

        res.send({
          jobs,
          totalJobs,
          totalPages: Math.ceil(totalJobs / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: "Internal Server Error",
          status: false,
        });
      }
    });

    app.get("/all-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const job = await jobsCollections.findOne({
        _id: new ObjectId(id)
      });
      res.send(job);
    });

    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await jobsCollections.deleteOne(filter);
      res.send(result);
    });

    function analyzeCvLocally(cvText) {
      const lines = cvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let name = "Unknown Candidate";
      if (lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.length < 50 && !firstLine.includes('@') && !/\d{5,}/.test(firstLine)) {
          name = firstLine;
        }
      }

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = cvText.match(emailRegex);
      const email = emails && emails.length > 0 ? emails[0] : "Unknown";

      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;
      const phones = cvText.match(phoneRegex);
      const phone = phones && phones.length > 0 ? phones[0] : "Unknown";

      const skillKeywords = [
        "JavaScript", "TypeScript", "React", "Node.js", "Node", "Express", "MongoDB", "MongoDB Atlas", 
        "Python", "Django", "Flask", "Java", "Spring Boot", "C++", "C#", "SQL", "PostgreSQL", "MySQL", 
        "HTML", "CSS", "Tailwind", "TailwindCSS", "Git", "GitHub", "Docker", "AWS", "Google Cloud", 
        "Firebase", "Next.js", "Redux", "GraphQL", "UI/UX", "Figma", "Marketing", "SEO", "Project Management",
        "Agile", "Scrum", "REST API", "CI/CD", "Machine Learning", "Data Analysis", "Communication", "Teamwork"
      ];
      
      const foundSkillsSet = new Set();
      skillKeywords.forEach(skill => {
        const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(cvText)) {
          foundSkillsSet.add(skill);
        }
      });

      const skills = Array.from(foundSkillsSet);
      if (skills.length === 0) {
        skills.push("Software Development", "Analytical Skills", "Problem Solving");
      }

      let score = 60 + Math.min(skills.length * 3, 25);
      if (cvText.length > 1500) score += 5;
      if (email !== "Unknown") score += 5;
      if (phone !== "Unknown") score += 5;
      score = Math.min(score, 100);

      let summary = "";
      if (skills.length > 3) {
        summary = `Experienced candidate with a strong foundation in software engineering, demonstrating key expertise in ${skills.slice(0, 3).join(', ')}, and ${skills[3]}. Proven track record of applying technical skills to solve complex problems and deliver high-quality solutions.`;
      } else {
        summary = `Dedicated and detail-oriented professional with skills in ${skills.join(', ')}. Eager to leverage background to contribute to team success and support business objectives.`;
      }

      const strengths = [];
      const improvements = [];
      const jobFit = [];

      if (skills.includes("React") || skills.includes("HTML") || skills.includes("CSS")) {
        strengths.push("Strong frontend development experience with modern libraries and CSS frameworks.");
        jobFit.push("Frontend Engineer", "React Developer");
      }
      if (skills.includes("Node") || skills.includes("Express") || skills.includes("MongoDB") || skills.includes("SQL")) {
        strengths.push("Solid understanding of backend architectures, REST APIs, and database modeling.");
        jobFit.push("Backend Developer", "Node.js Developer");
      }
      if (skills.includes("Python") || skills.includes("Machine Learning") || skills.includes("Data Analysis")) {
        strengths.push("Data-driven analytical skillset with proficiency in scripting and automation.");
        jobFit.push("Data Analyst", "Python Developer");
      }
      if (skills.includes("UI/UX") || skills.includes("Figma")) {
        strengths.push("Creative eye for interface design and user experience prototyping.");
        jobFit.push("UI/UX Designer", "Product Designer");
      }

      if (strengths.length < 3) {
        strengths.push("Clear and structured resume presentation showing progressive career growth.");
        strengths.push("Demonstrated proficiency in collaborative environments and modern version control (Git).");
      }
      while (strengths.length < 3) {
        strengths.push("Strong analytical and logical reasoning skills.");
      }

      improvements.push("Incorporate more quantifiable achievements (e.g., performance improvements, project impact percentages).");
      improvements.push("Add sections highlighting recent professional certifications or specialized training.");
      if (skills.length < 6) {
        improvements.push("Diversify the technical skillset by listing familiarity with testing frameworks or cloud technologies (e.g., AWS, Docker).");
      } else {
        improvements.push("Consolidate matching skills into clean categories to enhance scannability.");
      }

      if (jobFit.length < 2) {
        jobFit.push("Software Developer", "Full Stack Engineer");
      }
      jobFit.push("IT Operations Specialist");

      return {
        candidateInfo: {
          name,
          email,
          phone,
          skills
        },
        summary,
        score,
        strengths: strengths.slice(0, 3),
        improvements: improvements.slice(0, 3),
        jobFit: jobFit.slice(0, 3)
      };
    }

    app.post("/analyze-cv", upload.single('cv'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ status: false, message: "No CV file uploaded." });
        }

        const filePath = req.file.path;
        let cvText = "";

        // Extract text based on file format
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext === '.pdf') {
          const dataBuffer = fs.readFileSync(filePath);
          const parser = new PDFParse({ data: dataBuffer });
          const parsedData = await parser.getText();
          cvText = parsedData.text;
        } else if (ext === '.docx') {
          const result = await mammoth.extractRawText({ path: filePath });
          cvText = result.value;
        } else if (ext === '.txt') {
          cvText = fs.readFileSync(filePath, 'utf8');
        } else {
          // clean up file
          fs.unlinkSync(filePath);
          return res.status(400).json({ status: false, message: "Unsupported file format. Please upload a PDF, DOCX, or TXT file." });
        }

        // clean up file after reading
        fs.unlinkSync(filePath);

        if (!cvText || cvText.trim().length === 0) {
          return res.status(400).json({ status: false, message: "Could not extract text from the uploaded CV." });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey.trim() === "" || apiKey === "your_openai_api_key_here") {
          console.warn("OpenAI API Key is missing. Falling back to local rule-based CV analyzer.");
          const analysis = analyzeCvLocally(cvText);
          return res.status(200).json({ status: true, analysis });
        }

        // Call OpenAI API using native fetch
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert recruitment and career consultant. Analyze the candidate's CV text provided and return a valid JSON object matching the schema below. Keep descriptions concise, specific, and actionable. Do not add any markdown markup or wrappers (like ```json). Respond with only the JSON string.\n\nJSON Schema:\n{\n  \"candidateInfo\": {\n    \"name\": \"Candidate Name (extracted or 'Unknown')\",\n    \"email\": \"Email Address (extracted or 'Unknown')\",\n    \"phone\": \"Phone Number (extracted or 'Unknown')\",\n    \"skills\": [\"list of technical or core skills\"]\n  },\n  \"summary\": \"A high-level professional summary of the candidate (2-3 sentences)\",\n  \"score\": 85, // integer score from 0 to 100 representing CV quality/strength\n  \"strengths\": [\"key strength 1\", \"key strength 2\", \"key strength 3\"],\n  \"improvements\": [\"improvement recommendation 1\", \"improvement recommendation 2\"],\n  \"jobFit\": [\"recommended job title or industry 1\", \"recommended job title or industry 2\"]\n}"
              },
              {
                role: "user",
                content: cvText
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorDetails = await response.text();
          console.error("OpenAI API error response:", errorDetails);
          return res.status(500).json({ status: false, message: `OpenAI API error: ${response.statusText}. Please verify your API Key.` });
        }

        const result = await response.json();
        const responseText = result.choices[0].message.content;
        
        let analysis;
        try {
          analysis = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Error parsing OpenAI response JSON:", responseText);
          return res.status(500).json({ status: false, message: "Failed to parse analysis results from OpenAI." });
        }

        res.status(200).json({ status: true, analysis });

      } catch (error) {
        console.error("CV Analysis Error:", error);
        res.status(500).json({ status: false, message: "Internal server error occurred while analyzing the CV." });
      }
    });

    app.post("/subscribe", async (req, res) => {
      try {
        const { email } = req.body;
        if (!email || !email.includes("@")) {
          return res.status(400).json({ status: false, message: "Please enter a valid email address." });
        }
        
        const existing = await subscribersCollection.findOne({ email: email.toLowerCase() });
        if (existing) {
          return res.status(400).json({ status: false, message: "This email is already subscribed!" });
        }
        
        await subscribersCollection.insertOne({ 
          email: email.toLowerCase(), 
          subscribedAt: new Date() 
        });
        
        res.status(200).json({ status: true, message: "Thank you for subscribing!" });
      } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({ status: false, message: "Internal server error occurred while subscribing." });
      }
    });

    app.post("/signup", async (req, res) => {
      const { firstName, lastName, email, password, phoneNumber } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required (firstName, lastName, email, password)." });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      try {
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "User already exists" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing OTP record for this email before inserting a fresh one
        await otpCollection.deleteMany({ email });

        await otpCollection.insertOne({
          email,
          otp,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        try {
          await transporter.sendMail({
            from: `"Aidifys Hiring" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Signup OTP Verification Code",
            html: `
           <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #F7F9FC; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto;">
                <!-- Logo -->
                <div style="margin-bottom: 20px;">
                  <img src="${logoUrl}" alt="Company Logo" style="max-width: 150px; height: auto;" />
                </div>
    
                <!-- OTP Message -->
                <h2 style="color: #007BFF;">Your OTP code for Signup</h2>
                <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">
                  ${otp}
                </p>
                <p style="font-size: 14px; color: #555;">
                  This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
                </p>
    
                <!-- Footer -->
                <p style="font-size: 12px; color: #999; margin-top: 30px;">
                  &copy; ${new Date().getFullYear()} Aidifys Hiring. All Rights Reserved.
                </p>
              </div>
            `,
          });

          res.status(200).json({ message: "OTP sent to email. Please verify." });
        } catch (error) {
          console.error("Email send error:", error);
          return res.status(500).json({ message: "Failed to send OTP email." });
        }
      } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/verify-otp", async (req, res) => {
      const { email, otp } = req.body;

      try {
        const record = await otpCollection.findOne({ email });

        if (!record) {
          return res.status(400).json({ message: "Invalid OTP or email." });
        }

        if (record.expiresAt < new Date()) {
          await otpCollection.deleteMany({ email }); // clean up expired record
          return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
        }

        // Handle otp sent as array (e.g. ["1","2","3","4","5","6"]) or plain string
        const inputOtp = Array.isArray(otp) ? otp.join("") : String(otp);

        if (record.otp !== inputOtp) {
          return res.status(400).json({ message: "Incorrect OTP." });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email,
          password: hashedPassword,
          phoneNumber: req.body.phoneNumber,
        };

        await usersCollection.insertOne(newUser);
        await otpCollection.deleteOne({ email });

        res.status(201).json({ message: "User created successfully" });
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    });


    app.post("/resend-otp", async (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required." });
      }

      try {
        const existingOtpRecord = await otpCollection.findOne({ email });
        if (!existingOtpRecord) {
          return res.status(400).json({ message: "No OTP request found for this email." });
        }

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

        await otpCollection.updateOne(
          { email },
          {
            $set: {
              otp: newOtp,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
          }
        );

        try {
          await transporter.sendMail({
            from: `"Aidifys Hiring" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Resend OTP Verification Code",
            html: `
           <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #F7F9FC; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto;">
                <!-- Logo -->
                <div style="margin-bottom: 20px;">
                  <img src="${logoUrl}" alt="Company Logo" style="max-width: 150px; height: auto;" />
                </div>
    
                <!-- OTP Message -->
                <h2 style="color: #007BFF;">Your New OTP for Verification Code</h2>
                <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">
                  ${newOtp}
                </p>
                <p style="font-size: 14px; color: #555;">
                  This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.
                </p>
    
                <!-- Footer -->
                <p style="font-size: 12px; color: #999; margin-top: 30px;">
                  &copy; ${new Date().getFullYear()} Aidifys Hiring. All Rights Reserved.
                </p>
              </div>
            `,
          });

          res.status(200).json({ message: "OTP resent to your email." });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          return res.status(500).json({ message: "Failed to resend OTP email." });
        }
      } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/forgot-password", async (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required." });
      }

      try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await usersCollection.updateOne(
          { email },
          { $set: { resetToken, resetTokenExpiry } }
        );

        const resetLink = `https://www.aidifys.com/reset-password?token=${resetToken}`;

        ////local link ///
        // const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

        await transporter.sendMail({
          from: `"Aidifys Hiring" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Password Reset Request",
          html: `
           <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #F7F9FC; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto;">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="Company Logo" style="max-width: 150px; height: auto;" />
          </div>

           <!-- Title -->
          <h2 style="text-align: center; color: #333; margin-bottom: 20px;">Need a New Password?</h2>

           <!-- Text -->
         <p style="text-align: center; color: #555; font-size: 16px; margin-bottom: 30px;">
          No worries. Click the button below to reset and choose a new one. This link is valid for <strong>1 hour</strong>.
         </p>

          <!-- Button -->
          <div style="text-align: center; margin: 20px;">
          <a href="${resetLink}"
           style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 25px; font-size: 16px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
           </a>
          </div>

         <!-- Footer -->
       <p style="text-align: center; color: #777; font-size: 14px; margin-top: 40px;">
        Didn’t request this change? You can ignore this email and get back to 
        <a href="https://aidifys.com/" style="color: #1a73e8; text-decoration: none;">Aidifys Hiring</a>.
        </p>
  
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
            &copy; ${new Date().getFullYear()} Aidifys Hiring. All Rights Reserved.
          </p>
        </div>

          `,
        });

        res.status(200).json({ message: "Password reset link sent to your email." });
      } catch (error) {
        console.error("Error in forgot-password API:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/reset-password", async (req, res) => {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required." });
      }

      try {
        const user = await usersCollection.findOne({
          resetToken: token,
          resetTokenExpiry: { $gt: new Date() },
        });

        if (!user) {
          return res.status(400).json({ message: "Invalid or expired token." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await usersCollection.updateOne(
          { email: user.email },
          {
            $set: { password: hashedPassword },
            $unset: { resetToken: "", resetTokenExpiry: "" },
          }
        );

        res.status(200).json({ message: "Password has been reset successfully." });
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        const likedJobs = user.likedJobs;

        res.json({ token, name: user.firstName, userId: user._id, likedJobs });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });


    app.get('/user-info/:email', async (req, res) => {
      const userEmail = req.params.email;
      try {
        const user = await usersCollection.findOne({ email: userEmail });

        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
      } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    app.post("/job/like", authenticateToken, async (req, res) => {
      const { slug, userId, action } = req.body;

      if (!slug || !userId || !action) {
        return res.status(400).json({
          message: "Invalid request. Job slug, user ID, and like/unlike action are required.",
        });
      }

      try {
        // Find the job by slug
        const job = await jobsCollections.findOne({ slug });

        if (!job) {
          return res.status(404).json({ message: "Job not found." });
        }

        if (action === "like") {
          await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { likedJobs: job.slug } }
          );
        } else if (action === "unlike") {
          await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { likedJobs: job.slug } }
          );
        } else {
          return res.status(400).json({ message: "Invalid action. Use 'like' or 'unlike'." });
        }

        res.status(200).json({
          success: true,
          message: `Job successfully ${action}d.`,
        });
      } catch (error) {
        console.error("Error updating liked jobs:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    app.post('/apply', authenticateToken, upload.single('cvFile'), async (req, res) => {
      const { coverLetter, companyemail, companyjob, companyname, name, jobId, email } = req.body;
      const cvFile = req.file;

      if (!coverLetter || !cvFile || !name || !email) {
        return res.status(400).send('All fields are required.');
      }

      try {
        const userId = req.user.userId;

        const existingApplication = await jobApplicationsCollection.findOne({ userId, jobId });
        if (existingApplication) {
          return res.status(400).json({ message: 'You have already applied for this job.' });
        }
        const upload = multer({ dest: 'uploads/' });
        await jobApplicationsCollection.insertOne({
          userId,
          jobId,
          coverLetter,
          cvFilePath: cvFile.path,
          appliedAt: new Date(),
        });

        const mailOptionsToUser = {
          from: `"Aidifys Hiring" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Job Application Received',
          html: `
           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Company Logo" style="max-width: 150px; height: auto; margin: 0 auto; display: block;" />
    </div>
    <h2 style="text-align: center; color: #333333; font-size: 24px; font-weight: 600; margin-bottom: 20px;">
        Job Application Received
    </h2>
    <p style="font-size: 16px; color: #555555; line-height: 1.6;">
        Dear Applicant,
    </p>
    <p style="font-size: 16px; color: #555555; line-height: 1.6;">
        Thank you for applying for the position of <strong>${companyjob}</strong> at <strong>${companyname}</strong>. We have received your application.
    </p>
    <p style="font-size: 16px; color: #555555; text-align: center; line-height: 1.6;">
        You can visit our website for more job opportunities: 
        <a href="https://aidifys.com/" style="color: #1a73e8; text-decoration: none; font-weight: 600;">
            Aidifys Hiring
        </a>
    </p>
    <p style="font-size: 16px; color: #555555; line-height: 1.6;">
        Best regards,<br/>
        <strong>Aidifys Hiring</strong>
    </p>
</div>

          `
        };

        const mailOptionsToCompany = {
          from: `"Aidifys Hiring" <${process.env.EMAIL_USER}>`,
          to: companyemail,
          subject: 'New Job Application',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; background-color: #f9f9f9;">
                <h2 style="text-align: center; color: #333333;">New Job Application Received</h2>
                <p style="font-size: 16px; color: #555555;">A new job application has been received from <strong>${email}</strong>.</p>
                <p style="font-size: 16px; color: #555555;">
                    <strong>Job Title:</strong> ${companyjob}<br/>
                    <strong>Applicant Name:</strong> ${name}
                </p>
                <p style="font-size: 16px; color: #555555;"><strong>Cover Letter:</strong></p>
                <div style="font-size: 16px; color: #555555; border-left: 4px solid #dddddd; padding-left: 16px; margin: 16px 0;">
                    ${coverLetter}
                </div>
            </div>
          `,
          attachments: [
            {
              filename: cvFile.originalname,
              path: cvFile.path
            }
          ]
        };

        transporter.sendMail(mailOptionsToUser, (error, info) => {
          if (error) {
            console.error('Error sending email to user:', error);
          } else {
          }
        });

        transporter.sendMail(mailOptionsToCompany, (error, info) => {
          if (error) {
            console.error('Error sending email to company:', error);
            return res.status(500).send('Error submitting application.');
          } else {
            res.status(200).json({
              success: true,
              message: "Application Submitted Successfully!",
              data: mailOptionsToCompany
            });
          }
        });
      } catch (error) {
        console.error('Error applying for job:', error);
        res.status(500).send('Internal Server Error');
      }
    });
    app.get('/user-applied-jobs', authenticateToken, async (req, res) => {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      try {
        const applications = await jobApplicationsCollection
          .find({ userId })
          .sort({ appliedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const jobIds = applications.map(app => app.jobId);

        const jobs = await jobsCollections
          .find({ _id: { $in: jobIds.map(id => new ObjectId(id)) } })
          .toArray();

        const jobsWithAppliedDate = jobs.map(job => {
          const application = applications.find(app => app.jobId.toString() === job._id.toString());
          return {
            ...job,
            appliedAt: application ? application.appliedAt : null,
          };
        });

        const totalJobs = await jobApplicationsCollection.countDocuments({ userId });
        const totalPages = Math.ceil(totalJobs / limit);

        res.json({
          jobs: jobsWithAppliedDate,
          totalPages,
          currentPage: page,
          totalJobs,
        });
      } catch (error) {
        console.error('Error fetching user applied jobs:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    function generateSlug(title) {
      return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    app.post("/create-blog", imageUpload.single("image"), async (req, res) => {
      const { title, content, description, alttag } = req.body;
      const image = req.file;

      if (!title || !content || !image || !description || !alttag) {
        return res.status(400).json({ message: "All fields are required, including the image" });
      }

      try {
        const uploadResponse = await cloudinary.uploader.upload_stream(
          { folder: "blogs", resource_type: "auto" },
          async (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return res.status(500).json({ message: "Error uploading to Cloudinary", error: error.message });
            }

            const slug = generateSlug(title);

            const newBlog = {
              title,
              content,
              description,
              alttag,
              imageUrl: result.secure_url,
              cloudinaryId: result.public_id,
              slug,
              createdAt: new Date(),
            };

            const result1 = await blogsCollection.insertOne(newBlog);
            res.status(201).json({ message: "Blog created successfully", blogId: result1.insertedId });
          }
        );

        uploadResponse.end(image.buffer);

      } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
    });


    app.delete("/delete-blog/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });

        if (!blog) {
          return res.status(404).json({ message: "Blog not found." });
        }

        if (blog.cloudinaryId) {
          await cloudinary.uploader.destroy(blog.cloudinaryId);
        }

        const result = await blogsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Blog not found." });
        }

        res.status(200).json({ message: "Blog and its image deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
    });
    app.get("/blog-detail/:slug", async (req, res) => {
      const { slug } = req.params;

      try {
        const blog = await blogsCollection.findOne({ slug });

        if (!blog) {
          return res.status(404).json({ message: "Blog not found." });
        }

        res.status(200).json({ blog });
      } catch (error) {
        console.error("Error fetching blog:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/blogs", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 9;

      const skip = (page - 1) * limit;

      try {
        const totalBlogs = await blogsCollection.countDocuments();
        const blogs = await blogsCollection.find().skip(skip).limit(limit).toArray();

        res.status(200).json({
          blogs,
          totalBlogs,
          totalPages: Math.ceil(totalBlogs / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
    });


    app.post('/generate-signature', (req, res) => {
      const timestamp = Math.round((new Date()).getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        upload_preset: 'Aidifys'
      }, process.env.CLOUDINARY_API_SECRET);

      res.json({ timestamp, signature });
    });

    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Haris!');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
