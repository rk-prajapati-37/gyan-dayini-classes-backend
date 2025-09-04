const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// ✅ Helper function to normalize parent data (backward compatibility)
function normalizeStudentData(data) {
  const normalized = { ...data };
  
  // Convert old parentInfo structure to flat fields
  if (data.parentInfo && typeof data.parentInfo === 'object') {
    normalized.parentName = data.parentInfo.name || normalized.parentName;
    normalized.parentEmail = data.parentInfo.email || normalized.parentEmail;
    normalized.parentPhone = data.parentInfo.phone || normalized.parentPhone;
    delete normalized.parentInfo; // Remove old structure
  }
  
  return normalized;
}

// ✅ FIXED: Built-in Roll Number Generator
async function generateRollNumber(className, section = 'A') {
  try {
    // Generate class code
    const classCode = 
      className.includes('Jr. KG') ? 'JKG' :
      className.includes('Sr. KG') ? 'SKG' :
      className.includes('1st') ? '01' :
      className.includes('2nd') ? '02' :
      className.includes('3rd') ? '03' :
      className.includes('4th') ? '04' :
      className.includes('5th') ? '05' :
      className.includes('6th') ? '06' :
      className.includes('7th') ? '07' :
      className.includes('8th') ? '08' :
      className.includes('9th') ? '09' :
      className.includes('10th') ? '10' :
      'GEN';

    // Count existing students in same class/section
    const existingCount = await Student.countDocuments({
      class: className,
      section: section,
      academicYear: new Date().getFullYear().toString()
    });

    // Generate sequential number
    const sequentialNumber = String(existingCount + 1).padStart(3, '0');
    const rollNumber = `${classCode}${section}${sequentialNumber}`;
    
    console.log(`🎯 Generated roll number: ${rollNumber} (Based on ${existingCount} existing students)`);
    
    return {
      success: true,
      rollNumber: rollNumber
    };

  } catch (error) {
    console.error('❌ Roll number generation error:', error);
    
    // Fallback to timestamp-based
    const timestamp = Date.now().toString().slice(-4);
    const fallbackRoll = `GEN${section}${timestamp}`;
    
    return {
      success: false,
      rollNumber: fallbackRoll
    };
  }
}

// ✅ GET /api/students - Get all students
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      class: className = '',
      section = '',
      status = 'active'
    } = req.query;
    
    let query = {};
    
    // Filters
    if (className) query.class = className;
    if (section) query.section = section;
    if (status) query.status = status;
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { parentName: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query)
      .sort({ class: 1, section: 1, rollNumber: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalStudents = await Student.countDocuments(query);

    res.json({
      success: true,
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalStudents / limit),
        totalStudents,
        hasNext: parseInt(page) < Math.ceil(totalStudents / limit),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Get students error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching students',
      error: error.message 
    });
  }
});

// ✅ POST /api/students - Add new student
router.post('/', async (req, res) => {
  try {
    console.log('📝 Received student data:', req.body);
    
    const normalizedData = normalizeStudentData(req.body);
    
    const {
      name, email, phone, class: className, 
      section = 'A', rollNumber, parentName, 
      parentEmail, parentPhone, address
    } = normalizedData;

    // Validation
    if (!name || !className) {
      return res.status(400).json({
        success: false,
        message: 'Name and class are required'
      });
    }

    let finalRollNumber = rollNumber;
    
    // ✅ FIXED: Use built-in roll number generation
    if (!finalRollNumber) {
      try {
        const rollResult = await generateRollNumber(className, section);
        finalRollNumber = rollResult.rollNumber;
        console.log(`🎯 Generated roll number: ${finalRollNumber}`);
      } catch (error) {
        console.log('⚠️ Roll number generation failed, using timestamp fallback');
        const timestamp = Date.now().toString().slice(-4);
        finalRollNumber = `${className.slice(0,3)}${section}${timestamp}`;
      }
    }

    // Final validation for roll number
    if (!finalRollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is required'
      });
    }

    // Check for duplicates
    const existingStudent = await Student.findOne({ 
      rollNumber: finalRollNumber 
    });
    
    if (existingStudent) {
      // If duplicate, generate a new one with timestamp
      const timestamp = Date.now().toString().slice(-4);
      finalRollNumber = `${className.slice(0,3)}${section}${timestamp}`;
      console.log(`⚠️ Duplicate found, using fallback: ${finalRollNumber}`);
    }

    // Create new student with flat parent structure
    const student = new Student({
      name,
      email,
      phone,
      class: className,
      section,
      rollNumber: finalRollNumber,
      
      // ✅ Flat parent fields
      parentName,
      parentEmail,
      parentPhone,
      address,
      
      status: 'active',
      academicYear: new Date().getFullYear().toString()
    });

    const savedStudent = await student.save();
    console.log('✅ Student saved:', savedStudent.name, savedStudent.rollNumber);
    
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: savedStudent
    });
    
  } catch (error) {
    console.error('❌ Add student error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding student',
      error: error.message
    });
  }
});

// ✅ GET /api/students/:id - Get student by ID  
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    console.log('👁️ Fetching student:', student.name);
    console.log('👨‍👩‍👧‍👦 Parent info:', {
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone
    });
    
    res.json({
      success: true,
      student
    });
  } catch (error) {
    console.error('❌ Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message
    });
  }
});

// ✅ GET /api/students/:id/complete-profile - Get complete student profile
router.get('/:id/complete-profile', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    console.log('📋 Complete profile for:', student.name);
    console.log('👨‍👩‍👧‍👦 Parent details:', {
      parentName: student.parentName || 'Not provided',
      parentEmail: student.parentEmail || 'Not provided',
      parentPhone: student.parentPhone || 'Not provided',
      address: student.address || 'Not provided'
    });
    
    res.json({
      success: true,
      student: student
    });
  } catch (error) {
    console.error('❌ Get complete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student profile',
      error: error.message
    });
  }
});

// ✅ PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
  try {
    console.log('📝 Updating student:', req.params.id);
    console.log('📋 Update data:', req.body);
    
    const normalizedData = normalizeStudentData(req.body);
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        name: normalizedData.name,
        email: normalizedData.email,
        phone: normalizedData.phone,
        class: normalizedData.class,
        section: normalizedData.section,
        rollNumber: normalizedData.rollNumber,
        
        // ✅ Update flat parent fields
        parentName: normalizedData.parentName,
        parentEmail: normalizedData.parentEmail,
        parentPhone: normalizedData.parentPhone,
        address: normalizedData.address,
        
        status: normalizedData.status,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    );
    
    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    console.log('✅ Student updated successfully');
    console.log('👨‍👩‍👧‍👦 Updated parent info:', {
      parentName: updatedStudent.parentName,
      parentEmail: updatedStudent.parentEmail,
      parentPhone: updatedStudent.parentPhone
    });
    
    res.json({
      success: true,
      message: 'Student updated successfully',
      student: updatedStudent
    });
  } catch (error) {
    console.error('❌ Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
});

// ✅ DELETE /api/students/:id - Soft delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    console.log('🗑️ Student soft deleted:', student.name);
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
});

// ✅ POST /api/students/test-data - Add sample test data
router.post('/test-data', async (req, res) => {
  try {
    console.log('🧪 Adding test data...');
    
    const testStudents = [
      {
        name: "Amit Patel",
        email: "amit@example.com", 
        class: "Pre-Primary Jr. KG",
        section: "A",
        rollNumber: "JKGA001",
        
        // ✅ Use flat parent fields
        parentName: "Dinesh Patel",
        parentEmail: "dinesh@example.com",
        parentPhone: "9876543212",
        address: "Test Address, Mumbai"
      },
      {
        name: "Priya Sharma",
        email: "priya@example.com", 
        class: "1st",
        section: "A",
        rollNumber: "01A001",
        
        parentName: "Raj Sharma",
        parentEmail: "raj@example.com",
        parentPhone: "9876543213",
        address: "Test Address 2, Mumbai"
      }
    ];

    const savedStudents = await Student.insertMany(testStudents);
    console.log('✅ Test data added:', savedStudents.length, 'students');
    
    res.json({
      success: true,
      message: `${savedStudents.length} test students added successfully!`,
      students: savedStudents
    });
  } catch (error) {
    console.error('❌ Test data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding test data',
      error: error.message
    });
  }
});

module.exports = router;
