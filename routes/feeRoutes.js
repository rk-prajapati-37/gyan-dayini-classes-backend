const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const FeeStructure = require('../models/FeeStructure');
const Student = require('../models/Student');
const mongoose = require('mongoose');

// ✅ GET /api/fees/structures - Get all fee structures
router.get('/structures', async (req, res) => {
  try {
    console.log('📊 Fetching fee structures...');
    
    const structures = await FeeStructure.find({ status: 'active' })
      .sort({ className: 1 });
    
    console.log(`✅ Found ${structures.length} fee structures`);
    
    res.json({
      success: true,
      structures: structures,
      count: structures.length
    });
  } catch (error) {
    console.error('❌ Error fetching fee structures:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ POST /api/fees/structure - Create fee structure
router.post('/structure', async (req, res) => {
  try {
    console.log('🏗️ Creating fee structure:', req.body);
    
    const {
      className,
      section = 'A',
      academicYear,
      feeComponents,
      totalMonthlyFee
    } = req.body;

    if (!className || !totalMonthlyFee) {
      return res.status(400).json({
        success: false,
        message: 'Class name and total monthly fee are required'
      });
    }

    // Check if structure already exists
    const existingStructure = await FeeStructure.findOne({
      className,
      academicYear: academicYear || new Date().getFullYear().toString()
    });

    if (existingStructure) {
      return res.status(400).json({
        success: false,
        message: 'Fee structure already exists for this class'
      });
    }

    const feeStructure = new FeeStructure({
      className,
      section,
      academicYear: academicYear || new Date().getFullYear().toString(),
      feeComponents: feeComponents || [],
      totalMonthlyFee,
      status: 'active'
    });

    const savedStructure = await feeStructure.save();
    
    console.log(`✅ Created fee structure for ${className}: ₹${totalMonthlyFee}`);

    res.status(201).json({
      success: true,
      message: 'Fee structure created successfully',
      feeStructure: savedStructure
    });

  } catch (error) {
    console.error('❌ Error creating fee structure:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ POST /api/fees/generate-class-wise - Generate class-wise fees
router.post('/generate-class-wise', async (req, res) => {
  try {
    console.log('🎯 Class-wise fee generation request:', req.body);
    
    const { 
      month, 
      year, 
      generatedBy,
      specificClasses = [] 
    } = req.body;
    
    // Validation
    if (!month || !year || !generatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Month, year, and generatedBy are required'
      });
    }

    const academicYear = year.toString();
    
    // Get fee structures
    let structureQuery = { 
      status: 'active', 
      academicYear: academicYear 
    };
    
    if (specificClasses.length > 0) {
      structureQuery.className = { $in: specificClasses };
    }

    const feeStructures = await FeeStructure.find(structureQuery);
    
    if (feeStructures.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fee structures found. Please create fee structures first.',
        suggestion: 'Create class-wise fee structures first'
      });
    }

    console.log(`📊 Found ${feeStructures.length} fee structures to process`);

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    let totalGenerated = 0;

    // ✅ Process each fee structure (class-wise)
    for (const structure of feeStructures) {
      console.log(`🎯 Processing class: ${structure.className}`);
      
      // Get students for this specific class
      const students = await Student.find({
        class: structure.className
      });

      console.log(`👥 Found ${students.length} students in ${structure.className}`);

      // ✅ Process each student in this class individually
      for (const student of students) {
        try {
          // Check if fee already exists for this student
          const existingFee = await Fee.findOne({
            studentId: student._id,
            month,
            year: parseInt(year)
          });
          
          if (existingFee) {
            console.log(`⏩ Skipping ${student.name} - fee already exists`);
            results.skipped.push({
              studentName: student.name,
              className: structure.className,
              reason: 'Fee already exists'
            });
            continue;
          }

          // Calculate due date (15th of next month)
          const dueDate = new Date(year, getMonthNumber(month) + 1, 15);

          // ✅ Create individual fee
          const feeData = {
            studentId: student._id,
            feeStructureId: structure._id,
            month: month,
            year: parseInt(year),
            feeType: 'monthly',
            baseFeeAmount: structure.totalMonthlyFee,
            totalDiscount: 0,
            additionalCharges: 0,
            dueDate: dueDate,
            generatedBy: generatedBy,
            generationType: 'auto',
            isPaid: false,
            status: 'pending'
          };
          
          console.log(`🏗️ Creating fee for ${student.name}: ₹${structure.totalMonthlyFee}`);
          
          const fee = new Fee(feeData);
          const savedFee = await fee.save();
          
          console.log(`✅ Created fee: ${savedFee.invoiceNumber} for ${student.name}`);
          
          results.created.push({
            studentName: student.name,
            className: structure.className,
            invoiceNumber: savedFee.invoiceNumber,
            amount: savedFee.finalAmount
          });
          
          totalGenerated++;
          
        } catch (error) {
          console.error(`❌ Error creating fee for ${student.name}:`, error.message);
          results.errors.push({
            studentName: student.name,
            className: structure.className,
            error: error.message
          });
        }
      }
    }
    
    console.log(`🎉 Fee generation completed: Created=${totalGenerated}, Skipped=${results.skipped.length}, Errors=${results.errors.length}`);
    
    res.json({
      success: true,
      message: `Successfully generated ${totalGenerated} fees for ${month} ${year}`,
      generated: totalGenerated,
      skipped: results.skipped.length,
      errors: results.errors.length,
      details: results
    });
    
  } catch (error) {
    console.error('❌ Class-wise fee generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating fees',
      error: error.message
    });
  }
});

// ✅ POST /api/fees/manual - Manual fee entry
router.post('/manual', async (req, res) => {
  try {
    console.log('✏️ Manual fee entry request:', req.body);
    
    const {
      studentId,
      month,
      year,
      amount,
      feeType = 'manual',
      description = '',
      dueDate,
      generatedBy
    } = req.body;
    
    // Validation
    if (!studentId || !month || !year || !amount || !generatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, month, year, amount, and generatedBy are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if fee already exists for this student/month
    const existingFee = await Fee.findOne({
      studentId,
      month,
      year: parseInt(year)
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: 'Fee already exists for this student and month'
      });
    }

    // Calculate due date if not provided
    const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(year, getMonthNumber(month) + 1, 15);

    // Create manual fee entry
    const feeData = {
      studentId,
      month,
      year: parseInt(year),
      feeType,
      baseFeeAmount: parseInt(amount),
      totalDiscount: 0,
      additionalCharges: 0,
      dueDate: calculatedDueDate,
      generatedBy,
      generationType: 'manual',
      remarks: description,
      isPaid: false,
      status: 'pending'
    };

    const fee = new Fee(feeData);
    const savedFee = await fee.save();

    console.log(`✅ Manual fee created: ${savedFee.invoiceNumber} for ${student.name} - ₹${savedFee.finalAmount}`);

    res.status(201).json({
      success: true,
      message: `Manual fee created successfully for ${student.name}`,
      fee: savedFee,
      student: {
        name: student.name,
        class: student.class,
        rollNumber: student.rollNumber
      }
    });

  } catch (error) {
    console.error('❌ Manual fee entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating manual fee entry',
      error: error.message
    });
  }
});

// ✅ GET /api/fees - Get all fees with filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      month = '', 
      year = '', 
      isPaid = '',
      studentId = ''
    } = req.query;
    
    let query = {};
    
    // Apply filters
    if (month) query.month = month;
    if (year) query.year = parseInt(year);
    if (isPaid !== '') query.isPaid = isPaid === 'true';
    if (studentId) query.studentId = studentId;
    
    // Search functionality
    if (search && !studentId) {
      const students = await Student.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const studentIds = students.map(s => s._id);
      
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { studentId: { $in: studentIds } }
      ];
    }

    // Fetch fees with population
    const fees = await Fee.find(query)
      .populate('studentId', 'name rollNumber class section')
      .populate('feeStructureId', 'className totalMonthlyFee')
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalFees = await Fee.countDocuments(query);
    
    // Calculate summary
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$baseFeeAmount' },
          paidAmount: { $sum: { $cond: [{ $eq: ['$isPaid', true] }, '$baseFeeAmount', 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$isPaid', false] }, '$baseFeeAmount', 0] } },
          totalFees: { $sum: 1 }
        }
      }
    ];

    const summaryResult = await Fee.aggregate(summaryPipeline);
    const summary = summaryResult.length > 0 ? summaryResult[0] : {
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      totalFees: 0
    };

    res.json({
      success: true,
      fees,
      summary,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFees / limit),
        totalFees,
        hasNext: parseInt(page) < Math.ceil(totalFees / limit),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Get fees error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching fees',
      error: error.message 
    });
  }
});

// ✅ PUT /api/fees/:id/pay - Record payment
router.put('/:id/pay', async (req, res) => {
  try {
    const { paymentMethod, transactionId, remarks } = req.body;
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    const fee = await Fee.findById(req.params.id).populate('studentId', 'name');
    
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found'
      });
    }

    if (fee.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Fee is already paid'
      });
    }

    fee.isPaid = true;
    fee.paidDate = new Date();
    fee.paymentMethod = paymentMethod;
    fee.status = 'paid';
    if (transactionId) fee.transactionId = transactionId;
    if (remarks) fee.remarks = remarks;

    const updatedFee = await fee.save();

    res.json({
      success: true,
      message: `Payment recorded successfully for ${fee.studentId.name}`,
      fee: updatedFee
    });

  } catch (error) {
    console.error('❌ Payment recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment',
      error: error.message
    });
  }
});

// ✅ GET /api/fees/student-summary/:id - Get student fee summary
router.get('/student-summary/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const summaryPipeline = [
      { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: null,
          totalPending: { $sum: { $cond: [{ $eq: ['$isPaid', false] }, '$baseFeeAmount', 0] } },
          totalPaid: { $sum: { $cond: [{ $eq: ['$isPaid', true] }, '$baseFeeAmount', 0] } },
          feesCount: { $sum: 1 }
        }
      }
    ];

    const summaryResult = await Fee.aggregate(summaryPipeline);
    const summary = summaryResult.length > 0 ? summaryResult[0] : {
      totalPending: 0,
      totalPaid: 0,
      feesCount: 0
    };

    res.json({
      success: true,
      ...summary
    });

  } catch (error) {
    console.error('❌ Student fee summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student fee summary',
      error: error.message
    });
  }
});

// Helper function
function getMonthNumber(monthName) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months.indexOf(monthName);
}

module.exports = router;
