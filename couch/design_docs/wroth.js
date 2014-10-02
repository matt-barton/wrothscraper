module.exports = {
  _id: "_design/wroth",

  views: {

    dateIndices: {

      map: function(doc) {
        if (doc.type && doc.type == 'dateIndex') {
          emit(doc._id, doc);
        }
      },

      reduce: null
    }


  }
};