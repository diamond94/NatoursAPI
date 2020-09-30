const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1- create error if user POSTs Password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        `This Route is not for Password Update!! Please Use /updateMyPassword Route`,
        404
      )
    );
  }
  if (req.body.role) {
    return next(new AppError(`You are not allowed to Update your Role!!`, 403));
  }

  // 2- Update User Document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  if (!req.body.password) {
    return next(new AppError(`Please Enter Your Password to Delete Your Account!!`, 400));
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(req.body.password, user.password))) {
    return next(new AppError(`Wrong Password! Please Try Again!`, 400));
  }
  await User.findByIdAndUpdate(user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});
