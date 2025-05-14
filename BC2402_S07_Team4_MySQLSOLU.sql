/*
BC2402 Final Project 
MySQL Solution Team 4
Datasource: bc2402_gp
*/

/* Q1 */
# Understanding the table structure
SELECT * 
FROM customer_support;

SELECT distinct(category)
FROM customer_support;

SELECT count(distinct(category)) as count
FROM customer_support; -- there are words that look like proper categories when they are only in caps... is that our condition? look further.

SELECT * FROM customer_support
WHERE category LIKE "%city%" ; -- does it mean that all non-caps are irrelevant?

SELECT * FROM customer_support
WHERE category LIKE "%please%"; -- yes it should be the case

#Cleaning the category column
SELECT *
FROM customer_support
WHERE category REGEXP '^[A-Z]+$' ; -- able to only capture those categories that fulfil our proposed conditions of uppercase only.


/* Q2 */
SELECT category, COUNT(*) AS record_count FROM customer_support
WHERE flags REGEXP '^[A-Z]+$' -- Use REGEX function to ensure that flags only contain uppercase letters
  AND flags LIKE '%W%'
  AND flags LIKE '%Q%'
GROUP BY category;


/* Q3 */
/* Identify number of trips for each airline */
select Airline, count(*) as Total_Trips
from flight_delay
group by Airline;

/* Count number of cancellations for each airline */
select Airline, 'Cancellation' as Instance_Type, count(*) as Instances
from flight_delay
where Cancelled = 1
group by Airline

union
/* Count number of delays for each airline */
select Airline, 'Delay' as Instance_Type, count(*) as Instances
from flight_delay
where ArrDelay > 0 or DepDelay > 0
group by Airline;
/*Output indicates no cancellations*/

/* Identify instances of each type of delay in each airline*/
select Airline, 'Carrier Delays' as Delay_Type, count(*) as Instances
from flight_delay
where CarrierDelay > 0
group by Airline

union

select Airline, 'Weather Delays' as Delay_Type, count(*) as Instances
from flight_delay
where WeatherDelay > 0
group by Airline

union

select Airline, 'NAS Delays' as Delay_Type, count(*) as Instances
from flight_delay
where NASDelay > 0
group by Airline

union

select Airline, 'Security Delays' as Delay_Type, count(*) as Instances
from flight_delay
where SecurityDelay > 0
group by Airline

union

select Airline, 'Late Aircraft Delays' as Delay_Type, count(*) as Instances
from flight_delay
where LateAircraftDelay > 0
group by Airline
order by Airline, Delay_Type;


/* Q4 */
/* Thought Process:
All dates are within 2019, from Jan to Jun, no abnormal datapoints. No worries of needing to split year
(1) Obtain 'Month' by substringing the month out of the date string. Not datatime datatype so unable to use such functions
(2) Obtain 'Route' by joining strings "Origin" with "Dest"
(3) count(*) number of instances, and group by 'Month' and 'Route'
(4) Using the above as a subquery table, obtain the maximum instances each 'month' as 'maxi' (using max())
(5) Join Query obtained from (4) with an identical table from (3)
(6) Obtain final selection of Month, Route, and maxi AS DelayInstances
*/

SELECT t3.Month, t5.Route, t3.maxi as DelayInstances
FROM(
	SELECT Month, max(Counter) as maxi
	FROM(SELECT Month, Route, count(*) as Counter
		 FROM(SELECT substring(date, 4, 2) AS Month, concat(Origin, " to ", Dest) as Route
			  FROM flight_delay) AS t1
		 GROUP BY Month, Route) AS t2
	GROUP BY Month
    ) as t3
    JOIN
    (SELECT Month, Route, count(*) as Counter
		 FROM(SELECT substring(date, 4, 2) AS Month, concat(Origin, " to ", Dest) as Route
			  FROM flight_delay) AS t4
	 GROUP BY Month, Route
	) as t5
WHERE t3.maxi = t5.Counter AND t3.Month = t5.Month;


/* Q5 */
/* For the year 2023, display the quarter-on-quarter 
changes in high and low prices and the quarterly average price */

/* compares the quarters within 2023 */

/* quantile 1: Jan, Feb, Mar */
/* After - before / before */

SELECT 
    QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y')) AS Quarter,
    MIN(STR_TO_DATE(StockDate, '%m/%d/%Y')) AS QuarterStartDate,
    MAX(STR_TO_DATE(StockDate, '%m/%d/%Y')) AS QuarterEndDate,
    AVG(Price) AS QuarterlyAveragePrice,
    AVG(High) AS QuarterlyHigh,
    AVG(Low) AS QuarterlyLow,
    (AVG(Price) - LAG(AVG(Price)) OVER (ORDER BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y')))) 
          / LAG(AVG(Price)) OVER (ORDER BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y'))) * 100
          AS QuarterlyAveragePriceChange,

    (AVG(High) - LAG(AVG(High)) OVER (ORDER BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y')))) 
          / LAG(AVG(High)) OVER (ORDER BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y'))) * 100
          AS QuarterlyHighChange,

    (AVG(Low) - LAG(AVG(Low)) OVER (ORDER BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y')))) 
          / LAG(AVG(Low)) OVER (ORDER BY QUARTER(STR_TO_DATE(StockDate, '%m/%d/%Y'))) * 100
          AS QuarterlyLowChange
FROM 
    sia_stock
WHERE 
    YEAR(STR_TO_DATE(StockDate, '%m/%d/%Y')) = 2023
GROUP BY 
    Quarter
ORDER BY 
    Quarter;


/* Q6 */
/* For each sales_channel and each route, 
display the following ratios */
SELECT
	sales_channel,
    route,
	AVG(length_of_stay) / AVG(flight_hour) AS Stay_flight,
    AVG(wants_extra_baggage) / AVG(flight_hour) AS Baggage_flight,
    AVG(wants_preferred_seat) / AVG(flight_hour) AS Seat_flight,
    AVG(wants_in_flight_meals) / AVG(flight_hour) AS Meal_flight
FROM
	customer_booking
WHERE
	booking_complete != 0
GROUP BY
	sales_channel, route;


/* Q7 */
/* Thought Process:
General approach: Split into two tables for seasonal and another for non-seasonal, then JOIN them.
*/

SELECT 
	t5.Class, t5.Airline, 
    AvgSeatComfort_Seasonal, AvgFoodnBeverages_Seasonal, AvgInflightEntertainment_Seasonal, AvgValueForMoney_Seasonal, AvgOverallRating_Seasonal,
    AvgSeatComfort_NonSeasonal, AvgFoodnBeverages_NonSeasonal, AvgInflightEntertainment_NonSeasonal, AvgValueForMoney_NonSeasonal, AvgOverallRating_NonSeasonal
FROM 
    (SELECT Class, Airline, AVG(SeatComfort) as AvgSeatComfort_Seasonal, AVG(FoodnBeverages) as AvgFoodnBeverages_Seasonal, 
			AVG(InflightEntertainment) as AvgInflightEntertainment_Seasonal, AVG(ValueForMoney) as AvgValueForMoney_Seasonal, 
            AVG(OverallRating) as AvgOverallRating_Seasonal
	FROM
		(SELECT SUBSTRING(MonthFlown, 1, 3) as Month, MonthFlown, Name, ReviewDate, Title
		FROM airlines_reviews) as t1
		JOIN
		airlines_reviews as t2
	WHERE t1.MonthFlown = t2.MonthFlown AND t1.Name = t2.Name AND t1.ReviewDate = t2.ReviewDate AND t1.Title = t2.Title
		  AND t1.Month IN ("Jun", "Jul", "Aug", "Sep")
	GROUP BY Class, Airline
	) as t5
JOIN
	(SELECT Class, Airline, AVG(SeatComfort) as AvgSeatComfort_NonSeasonal, AVG(FoodnBeverages) as AvgFoodnBeverages_NonSeasonal, 
			AVG(InflightEntertainment) as AvgInflightEntertainment_NonSeasonal, AVG(ValueForMoney) as AvgValueForMoney_NonSeasonal, 
            AVG(OverallRating) as AvgOverallRating_NonSeasonal
	FROM
		(SELECT SUBSTRING(MonthFlown, 1, 3) as Month, MonthFlown, Name, ReviewDate, Title
		FROM airlines_reviews) as t3
		JOIN
		airlines_reviews as t4
	WHERE t3.MonthFlown = t4.MonthFlown AND t3.Name = t4.Name AND t3.ReviewDate = t4.ReviewDate AND t3.Title = t4.Title
		  AND t3.Month NOT IN ("Jun", "Jul", "Aug", "Sep")
	GROUP BY Class, Airline
	) as t6
WHERE t5.Class = t6.Class AND
	  t5.Airline = t6.Airline;


/* Q8 */
/*Count number of low ratings for each rating*/
select Airline, TypeofTraveller,
    sum(case when SeatComfort < 3 then 1 else 0 end) as SeatComfort_LessThan3,
    sum(case when StaffService < 3 then 1 else 0 end) as StaffService_LessThan3,
    sum(case when FoodnBeverages < 3 then 1 else 0 end) as FoodnBeverages_LessThan3,
    sum(case when InflightEntertainment < 3 then 1 else 0 end) as InflightEntertainment_LessThan3,
    sum(case when ValueForMoney < 3 then 1 else 0 end) as ValueForMoney_LessThan3
from airlines_reviews
group by Airline, TypeofTraveller
order by Airline, TypeofTraveller;

/*Create the keywords table with their corresponding Soundex codes*/
create temporary table category_keywords(
    keyword char(20),
    soundex_code char(10)
);
/*Insert the list of keywords and their corresponding Soundex codes*/
insert into category_keywords (keyword, soundex_code)
values
    ('expensive', soundex('expensive')),
    ('seat', soundex('seat')),
    ('legroom', soundex('legroom')),
    ('quality', soundex('quality')),
    ('food', soundex('food')),
    ('drinks', soundex('drinks')),
    ('beverage', soundex('beverage')),
    ('staff', soundex('staff')),
    ('employee', soundex('employee')),
    ('service', soundex('service')),
    ('crew', soundex('crew')),
    ('comfort', soundex('comfort')),
    ('meal', soundex('meal')),
    ('entertainment', soundex('entertainment')),
    ('price', soundex('price')),
    ('toilet', soundex('toilet')),
    ('hygiene', soundex('hygiene')),
    ('dirty', soundex('dirty')),
    ('noise', soundex('noise'));
    
/*Create temporary table to split the reviews*/
create temporary table numbers (n int);
insert into numbers (n) values (1), (2), (3), (4), (5), (6), (7), (8), (9), (10), (11), (12), (13), (14), (15); 

/* Top 5 common complains using wordcount of wordcount of specific words using soundex*/
/*Calculate soundex for each word in the reviews*/
with SplitReviews as (
    select
        r.Airline,
        r.TypeofTraveller,
        regexp_substr(r.Reviews, '[[:alpha:]]+', 1, n.n) as word,
        soundex(regexp_substr(r.Reviews, '[[:alpha:]]+', 1, n.n)) as word_soundex
    from airlines_reviews r
    join numbers n on char_length(r.Reviews) - char_length(replace(r.Reviews, ' ', '')) >= n.n - 1 
    /*Only take bad reviews to prevent counting from good reviews*/
    where r.Recommended = 'no'
),
/*Count the instances of each keyword for each airline and traveller type*/
KeywordInstances as (
    select
        r.Airline,
        r.TypeofTraveller,
        k.keyword,
        count(*) as KeywordCount
    from SplitReviews r
    join category_keywords k
        on r.word_soundex = k.soundex_code
    group by r.Airline, r.TypeofTraveller, k.keyword
),
/*Rank the keywords by frequency for each airline and traveller type*/
RankedKeywords as (
    select
        Airline,
        TypeofTraveller,
        keyword,
        KeywordCount,
        row_number() over (partition by Airline, TypeofTraveller order by KeywordCount desc) as ranked
    from KeywordInstances
)
select Airline, TypeofTraveller, keyword as Complains, KeywordCount
from RankedKeywords
where ranked <= 5
order by Airline, TypeofTraveller, KeywordCount desc;


/*Create 2nd table for keywords */
create table category_keywords2 (
    keyword char(20)
);

insert into category_keywords2 (keyword)
values
    ('expensive'), 
    ('seat'), 
    ('legroom'), 
    ('quality'), 
    ('food'), 
    ('drinks'), 
    ('beverage'), 
    ('staff'), 
    ('employee'), 
    ('service'), 
    ('crew'), 
    ('comfort'), 
    ('meal'), 
    ('entertainment'), 
    ('shows'), 
    ('price'), 
    ('toilet'), 
    ('noise'), 
    ('dirty'), 
    ('clean'), 
    ('hygiene');

/* Top 5 common complains using wordcount of specific words*/
with KeywordInstances2 as (
    select 
        Airline,
        TypeofTraveller,
        keyword,
        sum(case when lower(Reviews) like concat('%', keyword, '%') then 1 else 0 end) as KeywordCount2
    from 
        airlines_reviews
    join category_keywords2 k on lower(Reviews) like concat('%', k.keyword, '%')
    where 
        Recommended = 'no'
    group by 
        Airline, TypeofTraveller, keyword
),
RankedKeywords2 as (
    select 
        Airline,
        TypeofTraveller,
        keyword,
        KeywordCount2,
        row_number() over (partition by Airline, TypeofTraveller order by KeywordCount2 desc) as ranked2
    from KeywordInstances2
)
select
    Airline, 
    TypeofTraveller, 
    keyword as Complains, 
    KeywordCount2 as KeywordCount
from RankedKeywords2
where ranked2 <= 5
order by Airline, TypeofTraveller, KeywordCount2 desc;


/* Q9 */
/* First we find the number of Yes/No for Recommendations during Post and Pre Covid: */
SELECT 
    CASE 
        WHEN RIGHT(MonthFlown, 2) <= '19' THEN 'Pre-COVID'
        WHEN RIGHT(MonthFlown, 2) >= '23' THEN 'Post-COVID'
        ELSE NULL
    END AS Period, Recommended, COUNT(*) AS totalcount
FROM airlines_reviews
WHERE Airline = 'Singapore Airlines' AND (RIGHT(MonthFlown, 2) <= '19' OR RIGHT(MonthFlown, 2) >= '23')
GROUP BY Period, Recommended
ORDER BY Period, Recommended;

/* We then look further in-detail into the average separate ratings for each category: */
SELECT 
    CASE 
        WHEN RIGHT(MonthFlown, 2) <= '19' THEN 'Pre-COVID'
        WHEN RIGHT(MonthFlown, 2) >= '23' THEN 'Post-COVID'
        ELSE NULL
    END AS Period,
    COUNT(*) AS totalcount,
    AVG(OverallRating) AS average_overall_rating,
    AVG(SeatComfort) AS average_seat_comfort,
    AVG(StaffService) AS average_staff_service,
    AVG(FoodnBeverages) AS average_food_and_beverages,
    AVG(InflightEntertainment) AS average_inflight_entertainment,
    AVG(ValueForMoney) AS average_value_for_money
FROM airlines_reviews
WHERE Airline = 'Singapore Airlines' AND (RIGHT(MonthFlown, 2) <= '19' OR RIGHT(MonthFlown, 2) >= '23')
GROUP BY Period
ORDER BY Period;


/* Q10 */
# Make a new table
CREATE TABLE `table` (
    title VARCHAR(255),
    name VARCHAR(255),
    reviewdate DATE,
    Reviews TEXT,
    key_issues TEXT,
    responses VARCHAR(255)
);

INSERT INTO `table` (title, name, reviewdate, reviews)
SELECT title, name, STR_TO_DATE(reviewdate, '%d/%m/%Y'), reviews
FROM airlines_reviews;

SELECT * FROM `table` LIMIT 10;

DELIMITER //

CREATE FUNCTION response_generation(
    customer_name VARCHAR(255),
    key_issue VARCHAR(255),
    customer_support_hours VARCHAR(255),
    customer_support_phone VARCHAR(255),
    website_url VARCHAR(255)
) RETURNS TEXT
    NOT DETERMINISTIC
    READS SQL DATA
BEGIN
    RETURN CONCAT(
        -- TEXT 1: Random Greeting
        CASE
            WHEN RAND() < 0.33 THEN 'Hi '
            WHEN RAND() BETWEEN 0.33 AND 0.66 THEN 'Dear '
            ELSE 'Good day '
        END,
        customer_name, ', ',
        
        -- TEXT 2: Random Acknowledgment
        CASE
            WHEN RAND() < 0.33 THEN 'I understand that you have experienced '
            WHEN RAND() BETWEEN 0.33 AND 0.66 THEN 'I am incredibly sorry to hear that you went through '
            ELSE 'We would like to apologise for the inconvenience caused as you have suffered '
        END,
        
        -- Conditions for Key_issues based on Q8 findings
        CASE
            WHEN key_issue = 'Seat' OR key_issue = 'Comfort' THEN 'an uncomfortable journey'
            WHEN key_issue = 'Service' OR key_issue = 'Staff' OR key_issue = 'Crew' THEN 'poor quality of customer service'
            WHEN key_issue = 'Food' OR key_issue = 'Meal' THEN 'unsatisfactory food and dining experience'
            ELSE 'an unspecified issue.'
        END, '. ',
        
        -- TEXT 3: Contextualised Apology Based on Key Issue
        CASE
            WHEN key_issue = 'Seat' OR key_issue = 'Comfort' THEN 
                'We understand that it is important to have a comfortable journey, and it is our duty to ensure that all customers have a pleasant experience flying with SIA.'
            WHEN key_issue = 'Service' OR key_issue = 'Staff' OR key_issue = 'Crew' THEN 
                'SIA takes pride in our excellent customer service and we will not condone any dissatisfactory customer service on our part.'
            WHEN key_issue = 'Food' OR key_issue = 'Meal' THEN 
                'We are deeply apologetic to know that the food served was not up to standard and we will give feedback to the relevant parties.'
            ELSE 
                'We are currently reviewing your feedback and will address your concerns promptly.'
        END, ' ',
        
        -- FINAL GUIDELINES
        'If you wish to further your claim and seek compensation, our team is available during ',
        customer_support_hours, 
        '. You can reach us at ', 
        customer_support_phone, 
        ' or via Live Chat on our ', 
        website_url, 
        '. We value your satisfaction and are here to assist you.'
    );
END //

DELIMITER ;
SELECT response_generation(
     name, 
    'Food',  /*For Food*/
    '9AM - 6PM', 
    '+XX XXXX XXXX', 
    'EXAMPLEWEBSITE.COM'
) as Response
FROM `table`
LIMIT 10;

SELECT response_generation(
     name, 
    'Service', /*For Service*/
    '9AM - 6PM', 
    '+XX XXXX XXXX', 
    'EXAMPLEWEBSITE.COM'
) as Response
FROM `table`
LIMIT 10;

SELECT response_generation(
     name, 
    'Seat', /*For seat*/
    '9AM - 6PM', 
    '+XX XXXX XXXX', 
    'EXAMPLEWEBSITE.COM'
) as Response
FROM `table`
LIMIT 10;
