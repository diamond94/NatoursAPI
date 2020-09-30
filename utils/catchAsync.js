// we call it this way because the goal of this function is to catch errors
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // this is infact : (err => next(err))
  };
};
