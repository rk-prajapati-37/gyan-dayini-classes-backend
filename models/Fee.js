const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  
  feeStructureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure'
  },
  
  invoiceNumber: {
    type: String,
    unique: true
  },
  
  month: {
    type: String,
    required: true
  },
  
  year: {
    type: Number,
    required: true
  },
  
  feeType: {
    type: String,
    enum: ['monthly', 'admission', 'exam', 'transport', 'library', 'sports', 'manual', 'other'],
    default: 'monthly'
  },
  
  // Fee breakdown
  baseFeeAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  totalDiscount: {
    type: Number,
    default: 0
  },
  
  additionalCharges: {
    type: Number,
    default: 0
  },
  
  dueDate: {
    type: Date,
    required: true
  },
  
  // Payment details
  isPaid: {
    type: Boolean,
    default: false
  },
  
  paidDate: Date,
  paymentMethod: String,
  transactionId: String,
  
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  generationType: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  remarks: String,
  discountReason: String
}, {
  timestamps: true
});

// Virtual for final amount calculation
feeSchema.virtual('finalAmount').get(function() {
  return this.baseFeeAmount - this.totalDiscount + this.additionalCharges;
});

// Virtual for amount (alias for compatibility)
feeSchema.virtual('amount').get(function() {
  return this.baseFeeAmount;
});

// Auto-generate invoice number
feeSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const year = this.year || new Date().getFullYear();
    const month = this.month ? this.month.substr(0, 3).toUpperCase() : 'GEN';
    this.invoiceNumber = `INV-${year}-${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

feeSchema.set('toJSON', { virtuals: true });
feeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Fee', feeSchema);
