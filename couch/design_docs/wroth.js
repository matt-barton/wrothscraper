module.exports = {
  _id: "_design/wroth",

  views: {

    dateIndices: {

      map: function(doc) {
        if (doc.type && doc.type == 'dateIndex' && doc.indexDate) {
          emit(doc.indexDate, doc);
        }
      },

      reduce: null
    },

    messages: {

      map: function(doc) {
        if(doc.type && doc.type == 'message') {
          emit(doc.messageId, doc);
        }
      },

      reduce: null
    },

    maxMessageId: {

      map: function(doc) {
        if(doc.type && doc.type == 'message') {
          emit(null, doc.messageId);
        }
      },

      reduce: function(keys, values) {
        var ids = []
       
        values.forEach(function(id) {
          if (!isNaN(id))
            ids.push(id);
        });
       
        return Math.max.apply(Math, ids)
      }
    }
  }
};