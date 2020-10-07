const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, `Review can't be empty`],
      trim: true,
      maxlength: [200, `Review text can't exceed 200 charcheters`],
      minlength: [30, `Review text can't be under 30 charcheters`]
    },
    ratting: {
      type: Number,
      min: [1, `Rating can't be under 1`],
      max: [5, `Rating can't be above 5`]
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, `Review must belong to a user.`]
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, `Review must belong to a tour.`]
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.pre(/^find/, function(next) {
  this.populate({ path: 'tour', select: 'name' }).populate({
    path: 'user',
    select: 'name family photo'
  });
  next();
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
