const mongoose = require('mongoose');
const slugify = require('slugify');
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  // this object here called : schema definition
  {
    name: {
      type: String,
      required: [true, 'A Tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A Tour must have less or equal than 40 characters'],
      minlength: [10, 'A Tour must have more or equal than 10 characters']
      //validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: {
      type: String
    },
    duration: {
      type: Number,
      required: [true, 'A Tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour must have a maxGroupSize']
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is ether: easy,medium,difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, ' rating must be above 1.0'],
      max: [5, ' rating must be below 5.0']
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A Tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only point to current doc on new document creation
          return val < this.price; // 100 < 200 => true so we have no err and if 250 < 250 => false
        },
        message: 'Discount price ({VALUE}) should be below the regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A Tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String, // this will be name of the image wich later we will be able to read from file system
      required: [true, 'A Tour must have a imageCover']
    },
    images: [String],
    createdAt: {
      // TimeStamp
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean, // if true => secret tour and we don't want to show up
      default: false // by default it is false, coz usually tours are not secret
    }
  },
  // this object here called : schema options
  {
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// DOCUMENT MIDDLEWARE : runs before the save() and create() command but not on insertmany( )
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true }); // in pre save hook: 'this' keyword refer to current document
  next();
});

// tourSchema.pre('save', function(next) {
//   console.log('will save document');
//   next();
// });

// tourSchema.post('save', function(doc, next) { // in post save hook: we have no longer access to 'this' keyword
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
// in pre find hook: 'this' keyword refer to current query
tourSchema.pre(/^find/, function(next) {
  //tourSchema.pre('find', function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  // eslint-disable-next-line no-console
  console.log(`Query tooks : ${Date.now() - this.start} milliseconds!`);
  next();
});

//AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function(next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  //console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
