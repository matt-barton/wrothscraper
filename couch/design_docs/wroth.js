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
        var ids = [];
       
        values.forEach(function(id) {
          if (!isNaN(id)) ids.push(id);
        });
       
        return Math.max.apply(Math, ids)
      }
    },

    messageStubs: {

      map: function(doc) {
        if(doc.type && doc.type == 'message' && (typeof doc.complete == 'undefined' || doc.complete == false)) {
          emit(doc.messageId, doc);
        }
      },

      reduce: null
    },

    minMessageStubId: {

      map: function(doc) {
        if(doc.type && doc.type == 'message' && (typeof doc.complete == 'undefined' || doc.complete == false)) {
          emit(null, doc.messageId);
        }
      },

      reduce: function(keys, values) {
        var ids = [];
       
        values.forEach(function(id) {
          if (!isNaN(id)) ids.push(id);
        });
       
        return Math.min.apply(Math, ids)
      }
    },

    censoredMessages: {

      map: function(doc) {
        if (doc.type && doc.type == 'message') {
          if ((doc.title && (doc.title.indexOf('f**k') > -1 || doc.title.indexOf('c**t') > -1 || doc.title.indexOf('s**t') > -1)) ||
            (doc.body && (doc.body.indexOf('f**k') > -1 || doc.body.indexOf('c**t') > -1 || doc.body.indexOf('s**t') > -1))) {
            emit(doc.id, doc);
          }
        }
      },

      reduce: null
    },

    minUnprocessedMessageId: {

      map: function(doc) {
        if(doc.type && doc.type == 'message'
          && doc.complete && doc.complete == true 
          && ((typeof doc.processed == 'undefined' || doc.processed == false))) {
          emit(null, doc.messageId);
        }
      },

      reduce: function(keys, values) {
        var ids = [];
       
        values.forEach(function(id) {
          if (!isNaN(id)) ids.push(id);
        });
       
        return Math.min.apply(Math, ids)
      }
    },

    processedMessages: {

      map: function(doc) {
        if(doc.type && doc.type == 'message' && doc.complete && doc.processed) {
          emit(doc.messageId, doc);
        }
      },

      reduce: null
    }
  }
};