/* VAVE for Leaders — course settings and question banks for course.js.
   Questions: [question, [options], index of the correct option, explanation].
   Options are shuffled on screen, so their order here doesn't matter to learners. */
window.VH_COURSE = {
  id: "leaders",
  name: "VAVE for Leaders",
  storageKey: "vh-leaders",
  certPrefix: "VL-",
  passMark: 0.7,
  signInNext: "leaders.html?open=quiz",

  quick: {
    l1: [
      ["When is most of a product's lifetime cost decided?", ["During production", "During early design", "When purchasing negotiates with suppliers", "When the product is withdrawn"], 1,
        "70–80% is decided by design choices, before suppliers quote."],
      ["Your margin is 10%. A VAVE idea saves £50,000 a year. How much extra sales would bring in the same profit?", ["£55,000", "£500,000", "£5,000", "£5 million"], 1,
        "£50,000 ÷ 10% = £500,000."],
    ],
    l2: [
      ["Two products do exactly the same job. A costs £10 to make, B costs £8. Which has higher value?", ["A, because it costs more", "B", "They're the same", "You can't tell"], 1,
        "Same function for less cost means higher value."],
      ["Which of these is not a VAVE move?", ["Combining two parts into one stronger, cheaper part", "Dropping a feature almost no customer uses", "Using thinner material that fails durability tests, to save 5%", "Adding a feature customers will pay more for than it costs"], 2,
        "VAVE never cuts functions customers value."],
    ],
    l3: [
      ["What's the one thing you can't shorten in a VAVE workshop?", ["The number of people", "The length of the presentation", "Keeping idea generation and judging in separate sessions", "The cost analysis"], 2,
        "Judging ideas while they're being created kills the unusual ones."],
      ["When does a VAVE saving count?", ["When the idea is suggested", "When the sponsor approves it", "When the change is in production and checked against the fixed starting cost", "When the supplier agrees a lower price"], 2,
        "Only L4 savings are real."],
    ],
    l4: [
      ["A first proper VAVE round on a product nobody has studied usually finds about…", ["1–2% of product cost", "8–15% of product cost", "40–50% of product cost", "Nothing, because the design is already fixed"], 1,
        "First rounds typically find 8–15%, then 3–5% a year after that."],
      ["An idea saves £90,000 a year and costs £45,000 to bring in. What's the payback?", ["6 months", "18 months", "2 years", "45 days"], 0,
        "£45,000 ÷ £90,000 per year = half a year."],
    ],
    l5: [
      ["Why do most VAVE programmes fail?", ["The ideas are weak", "Nobody follows through", "Workshops are too expensive", "Customers notice the changes"], 1,
        "The ideas are usually good; what's missing is decisions, owners and monthly tracking."],
      ["Who is best placed to sponsor a company-wide VAVE programme?", ["The head of purchasing", "The chief engineer", "A neutral senior leader, such as the finance or operations director", "An outside consultant"], 2,
        "A neutral sponsor keeps both design and purchasing involved."],
    ],
    l6: [
      ["Which is the best first product for a VAVE study?", ["Your flagship product, where the tooling can't change", "A fairly simple, high-volume product your own engineers designed, with 2+ years of life left", "A product being discontinued next year", "A bought-in product you're not allowed to change"], 1,
        "Choose something you can change, with enough volume and life left, and a reason to fix it."],
      ["After 90 days, what best shows the programme is working?", ["The number of workshops held", "The number of ideas in the final presentation", "Checked savings in production", "Hours of training completed"], 2,
        "Only savings in production show the programme is working."],
    ],
  },

  quiz: [
    ["VAVE asks one question about everything you make. Which one?", ["What does this need to do, and what is the simplest reliable way to do it?", "How do we make this cheaper?", "Which supplier offers the lowest price?", "Which features could competitors copy?"], 0,
      "That one question is the whole method: the function first, then the simplest reliable way to deliver it."],
    ["How much of a product's lifetime cost is decided by design choices?", ["20–30%", "40–50%", "70–80%", "95–100%"], 2,
      "70–80% of lifetime cost is decided by design choices, before purchasing gets involved."],
    ["Your margin is 5%. A VAVE idea saves £20,000 a year. How much extra sales would earn the same profit?", ["£21,000", "£100,000", "£400,000", "£1 million"], 2,
      "£20,000 ÷ 5% = £400,000 of extra sales."],
    ["In the kettle example, the status light costs 60p but could be done reliably for 15p. What has the team found?", ["A function customers value, which should be cut", "A mismatch between what a function costs and what it's worth", "A supplier who's overcharging", "A new function to add"], 1,
      "A function that costs far more than it's worth is where VAVE looks first."],
    ["What's the difference between value analysis (VA) and value engineering (VE)?", ["VA works on products already in production; VE works during design", "VA is for purchasing, VE is for engineers", "They're the same thing, used in different countries", "VA measures value, VE cuts cost"], 0,
      "VA improves products already in production; VE works during design, where most cost is decided."],
    ["Which of these is a sign that a VAVE study is set up to fail?", ["A signed scope with a target", "A team drawn only from engineering", "A costed parts list checked by finance", "A trained facilitator"], 1,
      "A team from one department comes up with the same kind of ideas. VAVE needs a mixed team."],
    ["Your team comes up with ideas and judges them in the same session. What's the problem?", ["None; it saves time", "Unusual ideas get rejected before anyone develops them", "Finance can't check the numbers", "Suppliers can't take part"], 1,
      "Judging ideas while they're being created kills the unusual ones. Keep the steps apart."],
    ["A proposal is approved in March but goes into production in September. When do the savings start?", ["March", "September", "When finance signs it off", "At the start of the next financial year"], 1,
      "Savings start when the change is in production, so every month of delay costs money."],
    ["Which of these is a leader's job in VAVE?", ["Coming up with most of the ideas", "Drawing the FAST diagram", "Protecting the team's time and making decisions quickly", "Taking the competitor's product apart"], 2,
      "Leaders provide what follow-through needs: people, time, decisions and money."],
    ["What's the best measure of whether a VAVE programme is working?", ["The number of workshops held", "The number of ideas generated", "Checked savings in production, against a fixed starting cost", "How much staff enjoyed the workshops"], 2,
      "Only savings in production (L4), checked against a fixed starting cost, are real."],
  ],
};
