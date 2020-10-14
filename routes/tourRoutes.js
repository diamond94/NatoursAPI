const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

//router.param('id', tourController.checkID);

// implement Nested Routes

// POST/tour/jgfakg63126/reviews
// GET/tour/jgfakg63126/reviews

router.use('/:tourId/reviews', reviewRouter);

router.route('/top-5-cheap').get(tourController.aliasTopTour, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getToursStatistics);
router.route('/monthly-plan/:year').get(tourController.getMonthPlan);

router
  .route('/')
  .get(authController.protect, authController.checkEmailActivation, tourController.getAllTours)
  .post(tourController.createTour);
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    authController.restrictTo('Admin', 'Lead-Guaid'),
    tourController.deleteTour
  );

module.exports = router;
