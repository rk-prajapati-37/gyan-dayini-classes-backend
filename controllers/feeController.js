const Student = require('../models/Student');
const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');

class FeeController {
  
  // ✅ Create Fee Structure for a Class
  static async createFeeStructure(req, res) {
    try {
      const {
        className,
        section = 'A',
        academicYear,
        feeComponents,
        totalBaseFee
      } = req.body;

      console.log(`📊 Creating fee structure for: ${className} - ${section}`);

      const feeStructure = new FeeStructure({
        className,
        section,
        academicYear: academicYear || new Date().getFullYear().toString(),
        feeComponents,
        totalBaseFee,
        status: 'active'
      });

      const savedStructure = await feeStructure.save();
      
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
  }

  // ✅ Generate Individual Student Fees (Class-wise but Individual)
  static async generateStudentFees(req, res) {
    try {
      const {
        className,
        section = 'A',
        month,
        year,
        specificStudentIds = [] // Optional: for specific students only
      } = req.body;

      console.log(`🎯 Generating fees for: ${className} - ${section} - ${month} ${year}`);

      // Get fee structure for this class
      const feeStructure = await FeeStructure.findOne({
        className,
        academicYear: year.toString(),
        status: 'active'
      });

      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message: `No fee structure found for ${className} in ${year}`
        });
      }

      // Get students in this class
      let studentQuery = {
        class: className,
        status: 'active'
      };
      
      if (section) {
        studentQuery.section = section;
      }
      
      if (specificStudentIds.length > 0) {
        studentQuery._id = { $in: specificStudentIds };
      }

      const students = await Student.find(studentQuery);
      console.log(`👥 Found ${students.length} students in ${className}-${section}`);

      let generatedFees = [];
      let errors = [];

      // ✅ Generate fees for each student individually
      for (const student of students) {
        try {
          // Check if fee already exists for this student/month
          const existingFee = await StudentFee.findOne({
            studentId: student._id,
            month,
            academicYear: year.toString()
          });

          if (existingFee) {
            console.log(`⚠️ Fee already exists for ${student.name} - ${month} ${year}`);
            continue;
          }

          // Generate invoice number
          const invoiceNumber = await this.generateInvoiceNumber(student, month, year);

          // Calculate due date (15th of the month)
          const monthIndex = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"]
                            .indexOf(month);
          const dueDate = new Date(year, monthIndex, 15);

          // ✅ Create individual student fee with class-based structure
          const studentFee = new StudentFee({
            studentId: student._id,
            academicYear: year.toString(),
            month,
            feeStructureId: feeStructure._id,
            
            // Copy fee components from class structure (can be customized later)
            feeComponents: feeStructure.feeComponents.map(comp => ({
              name: comp.name,
              baseAmount: comp.amount,
              adjustedAmount: comp.amount, // Initially same as base
              discount: 0,
              isApplicable: !comp.isOptional // Optional components default to false
            })),
            
            baseFeeAmount: feeStructure.totalBaseFee,
            totalDiscount: 0,
            additionalCharges: 0,
            finalAmount: feeStructure.totalBaseFee,
            
            dueDate,
            invoiceNumber,
            status: 'pending'
          });

          const savedFee = await studentFee.save();
          generatedFees.push(savedFee);
          
          console.log(`✅ Generated fee for: ${student.name} - Invoice: ${invoiceNumber}`);

        } catch (error) {
          console.error(`❌ Error generating fee for ${student.name}:`, error.message);
          errors.push({
            studentName: student.name,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Generated ${generatedFees.length} individual student fees`,
        generated: generatedFees.length,
        total: students.length,
        errors: errors.length > 0 ? errors : undefined,
        fees: generatedFees
      });

    } catch (error) {
      console.error('❌ Error generating student fees:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ✅ Adjust Individual Student Fee
  static async adjustStudentFee(req, res) {
    try {
      const { feeId } = req.params;
      const {
        discount = 0,
        discountReason,
        additionalCharges = 0,
        remarks
      } = req.body;

      const studentFee = await StudentFee.findById(feeId)
        .populate('studentId', 'name class rollNumber');

      if (!studentFee) {
        return res.status(404).json({
          success: false,
          message: 'Student fee not found'
        });
      }

      // Calculate new final amount
      const newFinalAmount = studentFee.baseFeeAmount - discount + additionalCharges;

      const updatedFee = await StudentFee.findByIdAndUpdate(
        feeId,
        {
          totalDiscount: discount,
          discountReason,
          additionalCharges,
          finalAmount: newFinalAmount,
          remarks,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('studentId', 'name class rollNumber');

      console.log(`🔧 Adjusted fee for: ${updatedFee.studentId.name}`);
      console.log(`   💰 Base: ₹${studentFee.baseFeeAmount} | Discount: ₹${discount} | Final: ₹${newFinalAmount}`);

      res.json({
        success: true,
        message: 'Student fee adjusted successfully',
        fee: updatedFee
      });

    } catch (error) {
      console.error('❌ Error adjusting student fee:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ✅ Helper: Generate Invoice Number
  static async generateInvoiceNumber(student, month, year) {
    const monthAbbr = month.slice(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `INV-${student.rollNumber}-${monthAbbr}${year}-${timestamp}`;
  }
}

module.exports = FeeController;
