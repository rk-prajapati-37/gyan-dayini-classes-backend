const mongoose = require('mongoose');
const Student = require('../models/Student');

const studentSchema = new mongoose.Schema({
    name: String,
    age: Number,
    class: String
});

module.exports = mongoose.model('Student', studentSchema);

// Add student controller
exports.addStudent = async (req, res) => {
    try {
        const student = new Student({
            name: req.body.name,
            age: req.body.age,
            class: req.body.class
        });

        await student.save();
        res.status(201).send(student);
    } catch (err) {
        res.status(400).send(err);
    }
};
