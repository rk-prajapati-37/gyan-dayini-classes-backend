const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
    // e.g., "Pre-Primary Jr. KG", "1st", "2nd", etc.
  },
  section: {
    type: String,
    default: 'A'
  },
  academicYear: {
    type: String,
    required: true,
    default: () => new Date().getFullYear().toString()
  },
  
  // ✅ Class-wise Fee Components
  feeComponents: [{
    name: {
      type: String,
      required: true,
      // e.g., "Tuition", "Transport", "Lunch", "Activity"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    description: String
  }],
  
  // Total monthly fee for this class
  totalMonthlyFee: {
    type: Number,
    required: true,
    min: 0
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Compound index for uniqueness
feeStructureSchema.index({ className: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
