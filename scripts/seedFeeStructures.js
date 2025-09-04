const mongoose = require('mongoose');
const FeeStructure = require('../models/FeeStructure');

// ✅ Update this with your MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/gyan-dayini-classes';
// या आपका connection string जो भी हो

const feeStructures = [
  {
    className: "Pre-Primary Jr. KG",
    totalMonthlyFee: 2000,
    feeComponents: [
      { name: "Tuition Fee", amount: 1500, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "Pre-Primary Sr. KG",
    totalMonthlyFee: 2200,
    feeComponents: [
      { name: "Tuition Fee", amount: 1700, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "1st",
    totalMonthlyFee: 2500,
    feeComponents: [
      { name: "Tuition Fee", amount: 2000, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "2nd",
    totalMonthlyFee: 2600,
    feeComponents: [
      { name: "Tuition Fee", amount: 2100, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "3rd",
    totalMonthlyFee: 2700,
    feeComponents: [
      { name: "Tuition Fee", amount: 2200, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "4th",
    totalMonthlyFee: 2800,
    feeComponents: [
      { name: "Tuition Fee", amount: 2300, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "5th",
    totalMonthlyFee: 2900,
    feeComponents: [
      { name: "Tuition Fee", amount: 2400, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "6th",
    totalMonthlyFee: 3000,
    feeComponents: [
      { name: "Tuition Fee", amount: 2500, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "7th",
    totalMonthlyFee: 3100,
    feeComponents: [
      { name: "Tuition Fee", amount: 2600, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "8th",
    totalMonthlyFee: 3200,
    feeComponents: [
      { name: "Tuition Fee", amount: 2700, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "9th",
    totalMonthlyFee: 3500,
    feeComponents: [
      { name: "Tuition Fee", amount: 3000, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  },
  {
    className: "10th",
    totalMonthlyFee: 4000,
    feeComponents: [
      { name: "Tuition Fee", amount: 3500, isOptional: false },
      { name: "Activity Fee", amount: 300, isOptional: false },
      { name: "Maintenance Fee", amount: 200, isOptional: false }
    ]
  }
];

async function seedFeeStructures() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    console.log('🗑️ Clearing existing fee structures...');
    await FeeStructure.deleteMany({});
    
    console.log('📊 Creating fee structures...');
    const createdStructures = await FeeStructure.insertMany(feeStructures);
    
    console.log(`✅ Successfully created ${createdStructures.length} fee structures!`);
    
    console.log('\n📋 Created Fee Structures:');
    createdStructures.forEach(structure => {
      console.log(`  - ${structure.className}: ₹${structure.totalMonthlyFee}/month`);
    });
    
    console.log('\n🎉 Fee structures seeding completed!');
    console.log('✅ You can now use the "Generate Class-wise Fees" feature in your app.');
    
    mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding fee structures:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedFeeStructures();
