const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, `Please tell us your name :)`],
    trim: true
  },
  family: {
    type: String,
    required: [true, `Please tell us your name :)`],
    trim: true
  },
  email: {
    type: String,
    required: [true, `Please provide your Email :)`],
    trim: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, `Please Type validate Email`]
  },
  photo: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  role: {
    type: String,
    enum: {
      values: ['User', 'Guide', 'Lead-Guide', 'Admin'],
      message: `The Role you have entered is wrong!!`
    },
    default: 'User'
  },
  passwordChangedAt: {
    type: Date
  },
  password: {
    type: String,
    required: [true, `Please provide a Password`],
    trim: true,
    minlength: [8, `User password must be at least 8 characters`],
    select: false //this will never show in anyoutput
  },
  passwordConfirm: {
    type: String,
    required: [true, `Please confirm your Password`],
    trim: true,
    validate: {
      // this only work on save & create
      validator: function(value) {
        return value === this.password;
      },
      message: `passwords should be the same`
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  emailActive: {
    type: Boolean,
    default: false
  },
  emailActiveationToken: String,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockOutDate: Date
});

userSchema.pre('save', async function(next) {
  // only run this function if password has not been modified
  if (!this.isModified('password')) {
    return next();
  }
  //if password is  newly created!
  // hash password with 12 coast
  this.password = await bcrypt.hash(this.password, 12);

  // delete passwordConfirm fields
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: true });
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changesPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changeTimestap = this.passwordChangedAt.getTime() / 1000;
    // console.log(changeTimestap, JWTTimestamp);
    return JWTTimestamp < changeTimestap; //100<200
  }

  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 Min
  return resetToken;
};

userSchema.methods.emailActivationToken = function() {
  const emailToken = crypto.randomBytes(128).toString('hex');
  this.emailActiveationToken = crypto
    .createHash('sha256')
    .update(emailToken)
    .digest('hex');
  return emailToken;
};

userSchema.methods.checkLogin = function(limit) {
  if (this.loginAttempts < limit) {
    this.loginAttempts += 1;
  }
  if (this.loginAttempts >= limit) {
    this.lockOutDate = Date.now() + 30 * 60 * 1000;
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
