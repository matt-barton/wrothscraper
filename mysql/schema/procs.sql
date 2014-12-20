
DELIMITER '$$$';

DROP PROCEDURE IF EXISTS PostCountByUser$$$
CREATE PROCEDURE PostCountByUser(IN rows INT)
BEGIN
	IF (rows IS NULL) THEN
		SET rows = 9999;
	END IF;
	SELECT u.Username, COUNT(p.PostId) AS 'Posts'
	  FROM User u
	  JOIN Post p
	    ON p.UserId = u.UserId
	 GROUP BY p.UserId
	 ORDER BY Posts DESC
	 LIMIT rows;
END
$$$

DROP PROCEDURE IF EXISTS WordCountByUser$$$
CREATE PROCEDURE WordCountByUser(IN rows INT)
BEGIN
	IF (rows IS NULL) THEN
		SET rows = 9999;
	END IF;
	SELECT u.Username, COUNT(wp.WordId) AS 'Words'
	  FROM User u
	  JOIN Post p
	    ON p.UserId = u.UserId
	  JOIN WordInPost wp
	    on p.PostId = wp.PostId
	 GROUP BY p.UserId
	 ORDER BY Words DESC
	 LIMIT rows;
END
$$$

DROP PROCEDURE IF EXISTS RemovePost
$$$
CREATE PROCEDURE RemovePost(IN post_id INT)
BEGIN
	DELETE FROM WordInPost WHERE PostId = post_id;
	DELETE FROM Post WHERE PostId = post_id;
END
$$$

DROP PROCEDURE IF EXISTS LongestPostByUser$$$
CREATE PROCEDURE LongestPostByUser(IN rows INT)
BEGIN
	IF (rows IS NULL) THEN
		SET rows = 9999;
	END IF;
	SELECT u.Username, p.LongestPost, p.PostId, p.Timestamp
	  FROM User u
	  JOIN v_LongestPostByUser p
	    ON u.UserId = p.UserId
	 ORDER BY p.LongestPost DESC
	 LIMIT rows;
END
$$$

DROP PROCEDURE IF EXISTS ShowPost$$$
CREATE PROCEDURE ShowPost(IN post_id INT)
BEGIN
	SELECT w.Word
  	  FROM Word w
	  JOIN WordInPost wp
        ON w.WordId = wp.WordId
	 WHERE wp.Postid = post_id
  ORDER BY wp.Position;
END
$$$


DROP PROCEDURE IF EXISTS PostCountByDate$$$
CREATE PROCEDURE PostCountByDate()
BEGIN
	SELECT DATE(timestamp) AS Date, COUNT(PostId) AS Posts
	  FROM Post
  GROUP BY Date
  ORDER BY Date DESC;
END
$$$

DELIMITER ;



