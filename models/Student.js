const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true 
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  class: { 
    type: String, 
    required: [true, 'Class is required']
  },
  section: {
    type: String,
    uppercase: true,
    default: 'A'
  },
  rollNumber: { 
    type: String, 
    required: [true, 'Roll number is required'],
    unique: true
  },
  
  // ✅ FIXED: Flat Parent Information Fields
  parentName: { 
    type: String,
    trim: true
  },
  parentEmail: { 
    type: String,
    lowercase: true,
    trim: true
  },
  parentPhone: { 
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Academic Info
  academicYear: {
    type: String,
    default: () => new Date().getFullYear().toString()
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'transferred'],
    default: 'active'
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// ✅ Indexes for better performance
studentSchema.index({ rollNumber: 1 }, { unique: true });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ academicYear: 1 });

// ✅ Migration helper - Convert old parentInfo to flat fields
studentSchema.pre('save', function(next) {
  // If old parentInfo exists, convert to new structure
  if (this.parentInfo && typeof this.parentInfo === 'object') {
    if (this.parentInfo.name && !this.parentName) {
      this.parentName = this.parentInfo.name;
    }
    if (this.parentInfo.email && !this.parentEmail) {
      this.parentEmail = this.parentInfo.email;
    }
    if (this.parentInfo.phone && !this.parentPhone) {
      this.parentPhone = this.parentInfo.phone;
    }
    
    // Remove old nested structure
    this.parentInfo = undefined;
  }
  next();
});

// ✅ Error handling
studentSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.log('❌ Duplicate key error:', error);
    next(new Error('Roll number already exists'));
  } else if (error.name === 'ValidationError') {
    console.log('❌ Validation error:', error);
    next(error);
  } else {
    next(error);
  }
});

module.exports = mongoose.model('Student', studentSchema);
