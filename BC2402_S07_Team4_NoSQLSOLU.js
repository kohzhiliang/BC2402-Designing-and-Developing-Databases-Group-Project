/* 
Group 4 BC2402
Group Project Compiled Queries
*/

/*1.	How many categories are in [customer_suppport]?
TIP: You need to decide whether to clean up the data.*/
/* Filter for single-word alphabetic categories only,
count the number of distinct categories, and display them */
use GroupProject
db.customer_support.aggregate([
  {
    $group: {
      _id: "$category" // Group by category to get unique values
    }
  },
  {
    $match: {
      _id: { $regex: /^[A-Za-z]+$/, $options: "i" } // Filter for single-word alphabetic categories only
    }
  },
  {
    $facet: {
      categories: [{ $project: { category: "$_id", _id: 0 } }], // Display each unique category
      uniqueCategoryCount: [{ $count: "count" }] // Count the number of unique categories
    }
  },
  {
    $project: {
      categories: 1,
      uniqueCategoryCount: { $arrayElemAt: ["$uniqueCategoryCount.count", 0] } // Extract count value
    }
  }
])

/*2.	[customer_suppport] For each category, display the number of records that contained colloquial variation and offensive language.
TIP: Refer to language generation tags.*/
/* Thought process
Tags for Syntactic structure variation: (Obtained from https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset)
[
B - Basic syntactic structure: “activate my SIM card”, “I need to activate my SIM card”

I - Interrogative structure “can you activate my SIM card?”, “how do I activate my SIM card?”

C - Coordinated syntactic structure “I have a new SIM card, what do I need to do to activate it?”

N - Negation “I do not want this item, where to cancel my order?”

Tags for language register variations
P - Politeness variation “could you help me activate my SIM card, please?”

Q - Colloquial variation “can u activ8 my SIM?”

W - Offensive language “I want to talk to a f*&%*g agent”

Tags for stylistic variations
K - Keyword mode "activate SIM", "new SIM"

E - Use of abbreviations: “I'm / I am interested in getting a new SIM”

Z - Errors and Typos: spelling issues, wrong punctuation… “how can i activaet my card”

Other tags not in use in this Dataset
D - Indirect speech “ask my agent to activate my SIM card”

G - Regional variations US English vs UK English: "truck" vs "lorry" France French vs Canadian French: "tchatter" vs "clavarder"

R - Respect structures - Language-dependent variations English: "may" vs "can…" French: "tu" vs "vous..." Spanish: "tú" vs "usted..."

Y - Code switching “activer ma SIM card”
]
Therefore, if we are looking for colloquial variation and offensive language, we are looking for "Q" and "W" in "flags"
We would do this by using $regex for matching and group by category using $group in aggregate pipeline.
*/
db.customer_support.find() /*Initial exploration of data*/

db.customer_support.aggregate([
   {$match: {"flags": {$regex: /Q/}}
   {$match: {"flags": {$regex: /W/}}
   {$group: { _id: {groupbyCategory: "$category"}, numberofRecords: {$sum: 1}}
]);

/*3.	[flight_delay] For each airline, display the instances of cancellations and delays.
Hint: UNION, $merge*/
//Total trips for each airline
//_id:0 to remove the printing of id
db.flight_delay.aggregate([
    {
        $group: {
            _id: "$Airline",
            Total_Trips: { $sum: 1 }
        }
    },
    {
        $project: {
            Airline: "$_id",
            Total_Trips: 1,
            _id: 0
        }
    }
]);

// Create Indexes
db.flight_delay.createIndex({ Cancelled: 1 });
db.flight_delay.createIndex({ ArrDelay: 1, DepDelay: 1 });
db.flight_delay.createIndex({ Airline: 1 });

//Count cancellations and delays for each airline
db.flight_delay.aggregate([
    // Count cancellations
    {
        $match: { Cancelled: 1 }
    },
    {
        $group: {
            _id: "$Airline",
            Instances: { $sum: 1 }
        }
    },
    {
        $addFields: { Instance_Type: "Cancellation" }
    },
    
    // Use unionWith to count delays
    { $unionWith: {
        coll: "flight_delay",
        pipeline: [
            { $match: { $or: [{ ArrDelay: { $gt: 0 } }, { DepDelay: { $gt: 0 } }] } },
            { $group: { _id: "$Airline", Instances: { $sum: 1 } } },
            { $addFields: { Instance_Type: "Delay" } }
        ]
    }},
    
    {
        $project: {
            Airline: "$_id",
            Instance_Type: 1,
            Instances: 1,
            _id: 0
        }
    }
]);

// Create Indexes
db.flight_delay.createIndex({ CarrierDelay: 1 });
db.flight_delay.createIndex({ WeatherDelay: 1 });
db.flight_delay.createIndex({ NASDelay: 1 });
db.flight_delay.createIndex({ SecurityDelay: 1 });
db.flight_delay.createIndex({ LateAircraftDelay: 1 });

//Count each instances of delay for each delay type in each airline
db.flight_delay.aggregate([
    // Count carrier delays
    {
        $match: { CarrierDelay: { $gt: 0 } }
    },
    {
        $group: { _id: "$Airline", Instances: { $sum: 1 } }
    },
    { $addFields: { Delay_Type: "Carrier Delays" } },

    // Union with weather delays
    { $unionWith: {
        coll: "flight_delay",
        pipeline: [
            { $match: { WeatherDelay: { $gt: 0 } } },
            { $group: { _id: "$Airline", Instances: { $sum: 1 } } },
            { $addFields: { Delay_Type: "Weather Delays" } }
        ]
    }},
    
    // Union with NAS delays
    { $unionWith: {
        coll: "flight_delay",
        pipeline: [
            { $match: { NASDelay: { $gt: 0 } } },
            { $group: { _id: "$Airline", Instances: { $sum: 1 } } },
            { $addFields: { Delay_Type: "NAS Delays" } }
        ]
    }},

    // Union with security delays
    { $unionWith: {
        coll: "flight_delay",
        pipeline: [
            { $match: { SecurityDelay: { $gt: 0 } } },
            { $group: { _id: "$Airline", Instances: { $sum: 1 } } },
            { $addFields: { Delay_Type: "Security Delays" } }
        ]
    }},
    
    // Union with late aircraft delays
    { $unionWith: {
        coll: "flight_delay",
        pipeline: [
            { $match: { LateAircraftDelay: { $gt: 0 } } },
            { $group: { _id: "$Airline", Instances: { $sum: 1 } } },
            { $addFields: { Delay_Type: "Late Aircraft Delays" } }
        ]
    }},
    
    {
        $project: {
            Airline: "$_id",
            Delay_Type: 1,
            Instances: 1,
            _id: 0
        }
    },
    { $sort: { Airline: 1, Delay_Type: 1 } }
]);

/*4.	[flight_delay] For each month, which route has the most instances of delays? 
TIP: What are the first and last dates in the data?*/
db.flight_delay.aggregate([
    {
        $project: {
            route: { $concat: ["$Org_Airport", " to ", "$Dest_Airport"] },
            month: { $month: { $dateFromString: { dateString: "$Date", format: "%d-%m-%Y" } } }
        }
    },
    {
        $group: {
            _id: { month: "$month", route: "$route" },
            count: { $sum: 1 }
        }
    },
    {
        $sort: {
            "_id.month": 1,
            count: -1
        }
    },
    {
        $group: {
            _id: "$_id.month",
            topRoute: { $first: "$_id.route" },
            delayCount: { $first: "$count" }
        }
    },
    {
        $project: {
            _id: 0,
            month: "$_id",
            route: "$topRoute",
            delayCount: "$delayCount"
        }
    },
    {
        $sort: { month: 1 }
    }
]);


/* 5.	[sia_stock] For the year 2023, display the quarter-on-quarter changes in high and low prices and the quarterly average price.
Note: For details on Quarter-on-Quarter, see */

db.sia_stock.findOne()

db.sia_stock.aggregate([
  {$addFields: /*Because not all dates in the stockdate column are in date format. Checked in Excel. Need to change all into date.*/
    {StockDate: 
    {$dateFromString: { dateString: "$StockDate", format: "%m/%d/%Y" }}
    }
  },
  {$match: {StockDate: { $gte: ISODate("2022-10-01"), $lt: ISODate("2024-01-01") }
    }
  },
{$group: {
    _id: { 
    year: { $year: "$StockDate" },
    quarter: { $ceil: { $divide: [{ $month: "$StockDate" }, 3] } } /*Condition for quarters and split accordingly*/
    },
    quarterlyHigh: { $max: "$High" },
    quarterlyLow: { $min: "$Low" },
    avgPrice: { $avg: "$Price" }
    }
  },
  /* Sort*/
  {$sort: { "_id.year": 1, "_id.quarter": 1 } },
  /*Calculate quarter on quarter highs and lows*/
  {$setWindowFields: {
    sortBy: { "_id.year": 1, "_id.quarter": 1 },
    output: {
            prevQuarterHigh: { $shift: { output: "$quarterlyHigh", by: -1 } },
            prevQuarterLow: { $shift: { output: "$quarterlyLow", by: -1 } }
    }
    }
  },
  {$addFields: {
    Changehigh: {
        $cond: {
          if: { $eq: ["$prevQuarterHigh", null] },
          then: null,
          else: { $multiply: [{ $divide: [{ $subtract: ["$quarterlyHigh", "$prevQuarterHigh"] }, "$prevQuarterHigh"] }, 100] }
        }
      },
    Changelow: {
        $cond: {
          if: { $eq: ["$prevQuarterLow", null] },
          then: null,
          else: { $multiply: [{ $divide: [{ $subtract: ["$quarterlyLow", "$prevQuarterLow"] }, "$prevQuarterLow"] }, 100] }
        }
      }
    }
  },
  /*Exclude the 2022 data*/
  {
    $match: { "_id.year": { $gte: 2023 } }
  },
  /*Print */
  {$project: {
     year: "$_id.year",
     quarter: "$_id.quarter",
     quarterlyHigh: 1,
     quarterlyLow: 1,
     avgPrice: 1,
     Changehigh: 1,
     Changelow: 1}
  }
]);


/*6.[customer_booking] For each sales_channel and each route, display the following ratios
-	average length_of_stay / average flight_hour 
-	average wants_extra_baggage / average flight_hour
-	average wants_preferred_seat / average flight_hour
-	average wants_in_flight_meals / average flight_hour

Our underlying objective: Are there any correlations between flight hours, length of stay, and various preferences (i.e., extra baggage, preferred seats, in-flight meals)?*/

db.customer_booking.aggregate([
  {$group: { _id: { /*Group by sales_channel and route then average them into new variables*/
    sales_channel: "$sales_channel",
    route: "$route"
    },
    avgLOS: { $avg: "$length_of_stay" },
    avgFH: { $avg: "$flight_hour" },
    avgEB: { $avg: "$wants_extra_baggage" },
    avgPS: { $avg: "$wants_preferred_seat" },
    avgIFM: { $avg: "$wants_in_flight_meals" }
    }
  },
  /*Calculate the new ratios with above averages, $cond is to settle division by 0 for error handling*/
  {$addFields:{
    LOStoFH:{ 
    $cond:{ 
        if: { $ne: ["$avgFH", 0] },
        then: { $divide: ["$avgLOS", "$avgFH"] },
        else: null}
    },
    EBtoFH:{ 
    $cond:{ 
        if: { $ne: ["$avgFH", 0] },
        then: { $divide: ["$avgEB", "$avgFH"] },
        else: null}
    },
    PStoFH: { 
    $cond:{ 
        if: { $ne: ["$avgFH", 0] },
        then: { $divide: ["$avgPS", "$avgFH"] },
        else: null}
    },
    IFMtoFH: { 
    $cond: { 
        if: { $ne: ["$avgFH", 0] },
        then: { $divide: ["$avgIFM", "$avgFH"] },
        else: null}
    }
  }
},
  /*Print*/
  {$project: {
    sales_channel: "$_id.sales_channel",
    route: "$_id.route",
    LOStoFH: 1,
    EBtoFH: 1,
    PStoFH: 1,
    IFMtoFH: 1}
}
]);

/*7.	[airlines_reviews] Airline seasonality.
For each Airline and Class, display the averages of SeatComfort, FoodnBeverages, InflightEntertainment, ValueForMoney, and OverallRating for the seasonal and non-seasonal periods, respectively.

Note: June to September is seasonal, while the remaining period is non-seasonal.*/

db.airlines_reviews.aggregate([
    {
        $addFields: {
            month: {
                $substr: ["$MonthFlown", 0, 3]  // Extract the month part (e.g., "Dec")
            }
        }
    },
    {
        $addFields: {
            seasonality: {
                $cond: [
                    { $in: ["$month", ["Jun", "Jul", "Aug", "Sep"]] }, // June to September is seasonal
                    "Seasonal",
                    "Non-Seasonal"
                ]
            }
        }
    },
    {
        $group: {
            _id: { Airline: "$Airline", Class: "$Class", Seasonality: "$seasonality" },
            AvgSeatComfort: { $avg: "$SeatComfort" },
            AvgFoodnBeverages: { $avg: "$FoodnBeverages" },
            AvgInflightEntertainment: { $avg: "$InflightEntertainment" },
            AvgValueForMoney: { $avg: "$ValueForMoney" },
            AvgOverallRating: { $avg: "$OverallRating" }
        }
    },
    {
        $group: {
            _id: { Airline: "$_id.Airline", Class: "$_id.Class" },
            seasonalRatings: {
                $push: {
                    seasonality: "$_id.Seasonality",
                    AvgSeatComfort: "$AvgSeatComfort",
                    AvgFoodnBeverages: "$AvgFoodnBeverages",
                    AvgInflightEntertainment: "$AvgInflightEntertainment",
                    AvgValueForMoney: "$AvgValueForMoney",
                    AvgOverallRating: "$AvgOverallRating"
                }
            }
        }
    },
    {
        $project: {
            _id: 0,
            Airline: "$_id.Airline",
            Class: "$_id.Class",
            Seasonal: {
                $arrayElemAt: [
                    { $filter: {
                        input: "$seasonalRatings",
                        as: "rating",
                        cond: { $eq: ["$$rating.seasonality", "Seasonal"] }
                    }},
                    0
                ]
            },
            NonSeasonal: {
                $arrayElemAt: [
                    { $filter: {
                        input: "$seasonalRatings",
                        as: "rating",
                        cond: { $eq: ["$$rating.seasonality", "Non-Seasonal"] }
                    }},
                    0
                ]
            }
        }
    }
]);

/*8.	*Open-ended question; [airlines_reviews] 
What are the common complaints? 
For each Airline and TypeofTraveller, list the top 5 common issues.*/

//Q8
//Q8
db.airlines_reviews.aggregate([
    {
        $project: {
            Airline: 1,
            TypeofTraveller: 1,
            TotalCount: 1,
            SeatComfort: 1,
            StaffService: 1,
            FoodnBeverages: 1,
            InflightEntertainment: 1,
            ValueForMoney: 1,
        }
    },
    {
        $project: {
            Airline: 1,
            TypeofTraveller: 1,
            TotalCount: 1,
            SeatComfort_LessThan3: { $cond: [{ $lt: ["$SeatComfort", 3] }, 1, 0] },
            StaffService_LessThan3: { $cond: [{ $lt: ["$StaffService", 3] }, 1, 0] },
            FoodnBeverages_LessThan3: { $cond: [{ $lt: ["$FoodnBeverages", 3] }, 1, 0] },
            InflightEntertainment_LessThan3: { $cond: [{ $lt: ["$InflightEntertainment", 3] }, 1, 0] },
            ValueForMoney_LessThan3: { $cond: [{ $lt: ["$ValueForMoney", 3] }, 1, 0] }
        }
    },
    {
        $group: {
            _id: { Airline: "$Airline", TypeofTraveller: "$TypeofTraveller" },
            TotalRatings: { $sum: 1 },
            SeatComfort_LessThan3: { $sum: "$SeatComfort_LessThan3" },
            StaffService_LessThan3: { $sum: "$StaffService_LessThan3" },
            FoodnBeverages_LessThan3: { $sum: "$FoodnBeverages_LessThan3" },
            InflightEntertainment_LessThan3: { $sum: "$InflightEntertainment_LessThan3" },
            ValueForMoney_LessThan3: { $sum: "$ValueForMoney_LessThan3" }
        }
    },
    {
        $sort: { "_id.Airline": 1, "_id.TypeofTraveller": 1 }
    }
]);


db.airlines_reviews.aggregate([
    {
        $match: { Recommended: "no" }  // Only consider bad reviews
    },
    {
        $addFields: {
            splitWords: { 
                $split: [{ $ifNull: ["$Reviews", ""] }, " "]  // Split reviews into words
            }
        }
    },
    { $unwind: "$splitWords" },  // Unwind the split words array to process each word
    {
        $addFields: {
            word: { $toLower: { $trim: { input: "$splitWords" } } }  // Trim and convert to lowercase
        }
    },
    {
        $match: {
            word: { $in: [  // Match the predefined keywords
                'expensive', 'seat', 'legroom', 'quality', 'food', 'drinks', 'beverage',
                'staff', 'employee', 'service', 'crew', 'comfort', 'meal', 'entertainment',
                'shows', 'price', 'toilet', 'noise', 'dirty', 'clean', 'hygiene'
            ]}
        }
    },
    {
        $group: {
            _id: { Airline: "$Airline", TypeofTraveller: "$TypeofTraveller", Keyword: "$word" },
            KeywordCount: { $sum: 1 }
        }
    },
    {
        $sort: { "_id.Airline": 1, "_id.TypeofTraveller": 1, "KeywordCount": -1 }
    },
    {
        $group: {
            _id: { Airline: "$_id.Airline", TypeofTraveller: "$_id.TypeofTraveller" },
            top_keywords: {
                $push: {
                    keyword: "$_id.Keyword",
                    count: "$KeywordCount"
                }
            }
        }
    },
    {
        $project: {
            Airline: "$_id.Airline",
            TypeofTraveller: "$_id.TypeofTraveller",
            top5_issues: { $slice: ["$top_keywords", 5] }, // Only take the top 5 issues
            _id:0
        }
    },
    {
        $sort: { Airline: 1, TypeofTraveller: 1 }  // Sort by Airline and TypeofTraveller
    }
]);


/*9.	*Open-ended question; [airlines_reviews] and additional data* 
Are there any systematic differences in customer preferences/complaints pre- and post- COVID specific to Singapore Airlines?
	
Singapore Airlines hands out 8 months’ bonus following record annual profit 
https://www.channelnewsasia.com/business/singapore-airlines-scoot-employees-get-nearly-8-months-bonus-4340801

In addition to customer satisfaction, what do you think contributed to the strong performance of Singapore Airlines in recent periods?*/

/* Thought process
1. Find the ratio of "Yes" to "No" in "Recommended" column before COVID (Before 31-12-2019) and after COVID (After 31-12-2022)
^above dates are based on the "MonthFlown" column, Covid switched to endemic in SG in early 2023
2. Find average Ratings before and after Covid
*/
/*Finding number of recommendations before Covid and after Covid----*/
db.airlines_reviews.aggregate([
    {$addFields: {Year: {$substr: [ "$MonthFlown", 4, 2 ]}}
    {$match: {"Year": {$lte: "19"} }
    {$match: {"Airline": "Singapore Airlines"}}
    {$group: { _id: {GroupbyRecommendation_BeforeCovid: "$Recommended"}, totalcount: {$sum: 1}}}
]) ;
/* Returns 163 "no" and 441 "yes" */

db.airlines_reviews.aggregate([
    {$addFields: {Year: {$substr: [ "$MonthFlown", 4, 2 ]}}
    {$match: {"Year": {$gt: "22"}}}
    {$match: {"Airline": "Singapore Airlines"}}
    {$group: { _id: {GroupbyRecommendation_AfterCovid: "$Recommended"}, totalcount: {$sum: 1}}}
]);
/* Returns 58 "no" and 77 "yes" */



/*Finding All Average Ratings before and after Covid*/
db.airlines_reviews.aggregate([
    {$addFields: {Year: {$substr: [ "$MonthFlown", 4, 2 ]}}
    {$match: {"Year": {$lte: "19"}}}
    {$match: {"Airline": "Singapore Airlines"}}
    {$group: { _id: "$Airline" ,averageSeatComfortRating_BeforeCovid: {$avg: "$SeatComfort"},
              averageStaffServiceRating_BeforeCovid: {$avg: "$StaffService"},
              averageFoodnBeverageRating_BeforeCovid: {$avg: "$FoodnBeverages"},
              averageInflightEntertainmentRating_BeforeCovid: {$avg: "$InflightEntertainment"},
              averageValueForMoneyRating_BeforeCovid: {$avg: "$ValueForMoney"},
              averageOverallRating_BeforeCovid: {$avg: "$OverallRating"}
    }}
]);


db.airlines_reviews.aggregate([
    {$addFields: {Year: {$substr: [ "$MonthFlown", 4, 2 ]}}
    {$match: {"Year": {$gt: "22"}}}
    {$match: {"Airline": "Singapore Airlines"}}
    {$group: { _id: "$Airline" ,averageSeatComfortRating_AfterCovid: {$avg: "$SeatComfort"},
              averageStaffServiceRating_AfterCovid: {$avg: "$StaffService"},
              averageFoodnBeverageRating_AfterCovid: {$avg: "$FoodnBeverages"},
              averageInflightEntertainmentRating_AfterCovid: {$avg: "$InflightEntertainment"},
              averageValueForMoneyRating_AfterCovid: {$avg: "$ValueForMoney"},
              averageOverallRating_AfterCovid: {$avg: "$OverallRating"}
    }}
]);

/*10.	*Open-ended question; [airlines_reviews], [customer_suppport], and additional data* 
CAN Explains: Is Singapore Airlines obliged to compensate SQ321 passengers?
https://www.channelnewsasia.com/singapore/sq321-compensation-singapore-airlines-turbulence-cna-explains-4404701
	
How can a customer service chatbot be designed to help Singapore Airlines in such exceptional circumstances? 

Possible thinking process: Consider airlines_reviews to identify the relevant issues (e.g., safety and compensations). 
Consider customer_support in the general chatbot responses to various lexical variations. 
Propose linguistic design considerations for the chatbot (e.g., apologetic tones, detailed explanations, simple sentences).*/

/* Compensation & Chatbot Responses */

db.airlines_reviews.aggregate([
  // Step 1: Match reviews with low ratings or issues
  {
    $match: {
      Airline: "Singapore Airlines",
      $or: [
        { "SeatComfort": { $lt: 3 } },
        { "StaffService": { $lt: 3 } },
        { "FoodnBeverages": { $lt: 3 } },
        { "InflightEntertainment": { $lt: 3 } },
        { "ValueForMoney": { $lt: 3 } },
        { "OverallRating": { $lt: 3 } },
        { "Recommended": "no" }
      ]
    }
  },
  // Step 2: Add a field to indicate severity of issues based on the review text
  {
    $addFields: {
      issue_severity: {
        $cond: {
          if: { $regexMatch: { input: "$Reviews", regex: /delayed|cancelled|damaged/i } },
          then: "Severe",
          else: {
            $cond: {
              if: { $regexMatch: { input: "$Reviews", regex: /poor|disappointing|discomfort/i } },
              then: "Minor",
              else: "None"
            }
          }
        }
      }
    }
  },
  // Step 3: Add compensation type based on severity
  {
    $addFields: {
      compensation_type: {
        $cond: {
          if: { $eq: ["$issue_severity", "Severe"] },
          then: "Financial Compensation: Refund or Travel Credit",
          else: {
            $cond: {
              if: { $eq: ["$issue_severity", "Minor"] },
              then: "Non-Financial Compensation: Voucher or Miles",
              else: "No Compensation"
            }
          }
        }
      }
    }
  },
// Step 4: Add a new field "response" based on the review details
  {
    $addFields: {
      response: {
        $concat: [
          // Random Greeting
          { $arrayElemAt: [["Hi", "Dear", "Good day."], { $floor: { $multiply: [{ $rand: {} }, 3] } }] }, " ",
          // Passenger Name
          "$Name", ",\n",

          // Key Issue (seat comfort, staff service, etc.)
          { $cond: {
              if: { $lt: ["$SeatComfort", 3] },
              then: "We understand that it is important to have a comfortable journey, and it is our duty to ensure that all customers have a pleasant experience flying with SIA. ",
              else: ""
            }
          },
          { $cond: {
              if: { $lt: ["$StaffService", 3] },
              then: "SIA takes pride in our excellent customer service and we will not condone any dissatisfactory customer service on our part. ",
              else: ""
            }
          },
          { $cond: {
              if: { $lt: ["$FoodnBeverages", 3] },
              then: "We are deeply apologetic to know that the food served was not up to standard and we will give feedback to the relevant parties. ",
              else: ""
            }
          },
          { $cond: {
              if: { $lt: ["$InflightEntertainment", 3] },
              then: "We strive to offer a variety of entertainment options, and we are sorry that this did not meet your expectations. ",
              else: ""
            }
          },
          { $cond: {
              if: { $lt: ["$ValueForMoney", 3] },
              then: "We understand the importance of value, and we will take your feedback into consideration to improve our offerings. ",
              else: ""
            }
          },

          // Final Guidelines (compensation and support details)
          "\nIf you wish to further your claim and seek compensation, our team is available during 9 AM - 6 PM. You can reach us at +XX XXXX XXXX or via Live Chat on our EXAMPLEWEBSITE.COM."
        ]
      }
    }
  },
  // Step 5: Project all fields
  {
    $project: {
      _id: 0, // Exclude _id field
      Title: 1,
      Name: 1,
      Airline: 1,
      Verified: 1,
      Reviews: 1,
      SeatComfort: 1,
      StaffService: 1,
      FoodnBeverages: 1,
      InflightEntertainment: 1,
      ValueForMoney: 1,
      OverallRating: 1,
      Recommended: 1,
      issue_severity: 1,
      compensation_type: 1,
      response: 1
    }
  },
  {
    $limit: 4 // Limit to 4 documents for example output
  }
]);
