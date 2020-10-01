const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const emailActivation = async (user, req) => {
  const emailActiveToken = user.emailActivationToken();
  await user.save({ validateBeforeSave: false });

  const emailActiveURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/activeEmail/${emailActiveToken}`;

  const message = `<h3 style="text-align:center;color:green;">Please Active your Email Address<h3><div>
  \n<div style ="text-align: justify"><h5> Submit a patch request to link:<a href="${emailActiveURL}">Email Activation</a>\n
  if you didn't Request Email Activation please Ignore this Email`;

  sendEmail({
    email: user.email,
    subject: `YOUR Email Activation Token.`,
    html: message
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    family: req.body.family,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  // send email to active account
  emailActivation(newUser, req);

  const token = signToken(newUser._id);
  res.status(201).json({
    status: 'success',
    token,
    message: `Email Activation URL has been sent to Your Email Address Please Confirm Your Email Address.`,
    data: {
      user: newUser
    }
  });
});

exports.emailActivationRequest = catchAsync(async (req, res, next) => {
  const { user } = req;
  if (user.emailActive) {
    return next(new AppError(`Your Email is actived!!`, 400));
  }
  emailActivation(user, req);

  res.status(200).json({
    status: 'success',
    message: `Email Activation URL has been sent to Your Email Address Please Confirm Your Email Address.`
  });
});

exports.activeEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({ emailActiveationToken: hashedToken });
  if (!user) {
    return next(new AppError(`Token is Invalid or has Expired!!`, 400));
  }
  user.emailActive = true;
  user.emailActiveationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `Your Email has been Actived Successfuly!`
  });
});

exports.checkEmailActivation = catchAsync(async (req, res, next) => {
  if (!req.user.emailActive) {
    return next(new AppError(`Please Active your Email Address to access this Route!`, 403));
  }
  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1)- Check if email & password exits
  if (!email || !password) {
    return next(new AppError(`please provide email & password!`, 400));
  }
  // 2)- Check if user exists && password are valid
  const user = await User.findOne({ email: email }).select('+password'); // to select field wich by fields is false we should add + sign befor that

  // instance method is available on all the user document
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError(`Incorrect email or password!`, 401));
  }
  // 3)- if everything is ok, send Token to client
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    Role: user.role,
    token
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1)- getting token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError(`Your are not logged in!! Please LogIn to get Access`, 401));
  }
  // 2)- verification token
  const decodedPayload = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3)- check user if still exists
  const currentUser = await User.findById(decodedPayload.id);
  if (!currentUser) {
    return next(new AppError(`The User belong to this Token does no longer Exists`, 401));
  }
  // 4)- check if user changed password after the token issued
  if (currentUser.changesPasswordAfter(decodedPayload.iat)) {
    return next(new AppError(`user recently  changed password! please login again!`), 401);
  }
  req.user = currentUser;
  // Grant access to protected Route
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`You don't have permision to perform this!!`, 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1)- Get user based on posted Email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`There is no user wich that Email Address`, 404));
  }

  // 2)- Generate Random reset Token & save it to the DBs
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3)- Send it to user Email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `<h3 style="text-align:center;color:green;">Forgot your Password?<h3><div>
                   \n<div style ="text-align: justify"><h5> Submit a patch request with your new password 
                   & Password confirm to link:<a href="${resetURL}">Reset Password</a>\n
                   if you didn't forgot your Password please Ignore this Email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Password Reset Token(valid for 10 min)',
      html: message
    });

    res.status(200).json({
      status: 'success',
      message: `Token send to the mail`
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError(`There was an Error sending the Email! please try Again`, 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1- Get User based on Token
  const hasehdToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hasehdToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2- if token has not expired & there is user , set the new password
  if (!user) {
    return next(new AppError(`Token is Invalid or has Expired!!`, 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3- update changed passwordAT property for the user

  // 4- log the user in , sen jwt
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    Role: user.role,
    token
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1- Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2- check if posted password is correct
  if (!(await user.correctPassword(req.body.password, user.password))) {
    return next(new AppError(`Password is incorrect please try again!!`, 400));
  }

  // 3- update the password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();
  // User.findByIdAndUpdate will not work!! coz pre save hook only run on save & create method!

  // 4- log the user in , send jwt
  const newToken = signToken(user._id);
  res.status(200).json({
    status: 'success',
    Role: user.role,
    message: `Successfuly update password`,
    newToken
  });
});
