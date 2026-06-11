const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
mongoose.connect('mongodb://127.0.0.1:27017/greenscan')
  .then(() => console.log('✅ MongoDB Connected successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. MONGOOSE MODELS
// ==========================================
const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const resourceSchema = new mongoose.Schema({
  paperBalance: { type: Number, default: 5000 },
  toner: {
    cyan: { type: Number, default: 100 },
    magenta: { type: Number, default: 100 },
    yellow: { type: Number, default: 100 },
    black: { type: Number, default: 100 }
  }
});
const Resource = mongoose.model('Resource', resourceSchema);

const printJobSchema = new mongoose.Schema({
  docName: { type: String, required: true },
  user: { type: String, default: 'Current User' },
  pages: { type: Number, required: true },
  type: { type: String, enum: ['Color', 'Black & White'], required: true },
  time: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const PrintJob = mongoose.model('PrintJob', printJobSchema);

const initDB = async () => {
  const count = await Resource.countDocuments();
  if (count === 0) {
    await Resource.create({});
    console.log('🌱 Initialized default resources: 5000 sheets, 100% toner');
  }
};
initDB();

// ==========================================
// 3. AUTHENTICATION ROUTES
// ==========================================
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email is already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration" });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const resources = await Resource.findOne();
    res.status(200).json({ 
      message: "Login successful",
      user: { name: user.name, email: user.email },
      paperBalance: resources ? resources.paperBalance : 5000
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// ==========================================
// 4. DASHBOARD & PRINT ROUTES
// ==========================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const resources = await Resource.findOne();
    const jobs = await PrintJob.find().sort({ _id: -1 }).limit(8); 

    const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let chartData = [];
    
    for(let i = 6; i >= 0; i--) {
      let d = new Date();
      d.setDate(d.getDate() - i);
      let dateString = d.toISOString().split('T')[0]; 
      
      chartData.push({ 
        name: daysArr[d.getDay()], 
        pages: 0, 
        dateString: dateString 
      });
    }

    let sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentWeeklyJobs = await PrintJob.find({ createdAt: { $gte: sevenDaysAgo } });

    recentWeeklyJobs.forEach(job => {
      if(job.createdAt) {
        const jobDate = new Date(job.createdAt).toISOString().split('T')[0];
        const dayIndex = chartData.findIndex(d => d.dateString === jobDate);
        if(dayIndex !== -1) {
          chartData[dayIndex].pages += (job.pages || 0);
        }
      }
    });

    res.json({ resources, jobs, chartData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const allJobs = await PrintJob.find().sort({ _id: -1 }); 
    res.json(allJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/print', async (req, res) => {
  const { name, pages, type, user } = req.body;
  const pageCount = Number(pages);

  const paperDeduction = -pageCount;
  let tonerDeduction = {};

  const getRandomConsumption = (baseRate, variance) => {
    const randomDiff = (Math.random() * variance * 2) - variance; 
    const actualRate = Math.max(0.005, baseRate + randomDiff); 
    return pageCount * actualRate;
  };

  if (type === 'Color') {
    tonerDeduction = {
      "toner.cyan": -getRandomConsumption(0.025, 0.015),
      "toner.magenta": -getRandomConsumption(0.025, 0.015),
      "toner.yellow": -getRandomConsumption(0.025, 0.015),
      "toner.black": -getRandomConsumption(0.015, 0.005) 
    };
  } else {
    tonerDeduction = { "toner.black": -getRandomConsumption(0.035, 0.015) };
  }

  try {
    const updatedResources = await Resource.findOneAndUpdate(
      {},
      { $inc: { paperBalance: paperDeduction, ...tonerDeduction } },
      { new: true }
    );

    const newJob = new PrintJob({
      docName: name || 'Untitled Document',
      user: user || 'Guest',
      pages: pageCount,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    const savedJob = await newJob.save();

    res.status(201).json({ message: 'Print job logged successfully', resources: updatedResources, newJob: savedJob });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process print job' });
  }
});

// --- UPDATED ROUTE: CUSTOM REFILL (FIXED MONGODB NESTED OBJECT ISSUE) ---
app.post('/api/refill', async (req, res) => {
  try {
    const { paper, cyan, magenta, yellow, black } = req.body;
    
    // 1. Get the current totals
    let resource = await Resource.findOne();
    if (!resource) resource = await Resource.create({});

    // 2. Add the new amounts, and force a hard cap (5000 for paper, 100 for toner)
    const newPaper = Math.min(5000, resource.paperBalance + (Number(paper) || 0));
    const newCyan = Math.min(100, resource.toner.cyan + (Number(cyan) || 0));
    const newMagenta = Math.min(100, resource.toner.magenta + (Number(magenta) || 0));
    const newYellow = Math.min(100, resource.toner.yellow + (Number(yellow) || 0));
    const newBlack = Math.min(100, resource.toner.black + (Number(black) || 0));

    // 3. Use $set to completely bypass the nested object bug in MongoDB
    const updatedResources = await Resource.findOneAndUpdate(
      {},
      { 
        $set: { 
          paperBalance: newPaper, 
          "toner.cyan": newCyan, 
          "toner.magenta": newMagenta, 
          "toner.yellow": newYellow, 
          "toner.black": newBlack 
        } 
      },
      { new: true }
    );

    res.status(200).json({ message: 'Supplies refilled successfully', resources: updatedResources });
  } catch (err) {
    console.error("Refill error:", err);
    res.status(500).json({ error: 'Failed to refill supplies' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));