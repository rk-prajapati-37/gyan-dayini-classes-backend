const mongoose = require('mongoose');
const Student = require('../models/Student');

// Connect to database
mongoose.connect('mongodb://localhost:27017/gyan-dayini', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function migrateParentInfo() {
  try {
    console.log('🔄 Starting parent info migration...');
    
    // Find all students with old parentInfo structure
    const studentsToMigrate = await Student.find({
      $or: [
        { parentInfo: { $exists: true } },
        { 'parentInfo.name': { $exists: true } },
        { 'parentInfo.email': { $exists: true } },
        { 'parentInfo.phone': { $exists: true } }
      ]
    });

    console.log(`📊 Found ${studentsToMigrate.length} students to migrate`);
    
    if (studentsToMigrate.length === 0) {
      console.log('✅ No students need migration');
      process.exit(0);
    }
    
    let migrated = 0;
    
    for (const student of studentsToMigrate) {
      try {
        const updateFields = {};
        let hasChanges = false;
        
        // Extract parent info from nested object
        if (student.parentInfo) {
          if (student.parentInfo.name && !student.parentName) {
            updateFields.parentName = student.parentInfo.name;
            hasChanges = true;
          }
          if (student.parentInfo.email && !student.parentEmail) {
            updateFields.parentEmail = student.parentInfo.email;
            hasChanges = true;
          }
          if (student.parentInfo.phone && !student.parentPhone) {
            updateFields.parentPhone = student.parentInfo.phone;
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          // Update student with flat fields and remove old parentInfo
          await Student.findByIdAndUpdate(
            student._id,
            {
              $set: updateFields,
              $unset: { parentInfo: "" } // Remove old nested field
            }
          );
          
          migrated++;
          console.log(`✅ Migrated: ${student.name} (${student.rollNumber})`);
          console.log(`   └─ Parent: ${updateFields.parentName || 'N/A'} | Phone: ${updateFields.parentPhone || 'N/A'}`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating student ${student.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed! ${migrated} students migrated successfully.`);
    
    // Verify migration
    const remainingOldFormat = await Student.countDocuments({
      parentInfo: { $exists: true }
    });
    
    const newFormatCount = await Student.countDocuments({
      $or: [
        { parentName: { $exists: true } },
        { parentEmail: { $exists: true } },
        { parentPhone: { $exists: true } }
      ]
    });
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Students with new format: ${newFormatCount}`);
    console.log(`   ⚠️  Students with old format: ${remainingOldFormat}`);
    
    if (remainingOldFormat === 0) {
      console.log(`\n🎯 All students successfully migrated to new format!`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Migration interrupted by user');
  mongoose.connection.close();
  process.exit(0);
});

// Run migration
migrateParentInfo();
