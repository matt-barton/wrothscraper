
CREATE OR REPLACE VIEW v_LongestPostByUser AS
    SELECT UserId, PostId, Timestamp, MAX(WordCount) AS LongestPost
      FROM Post
  GROUP BY UserId;

