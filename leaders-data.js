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

  // The final-quiz questions are stored on the server (supabase-exam.sql), not in this public file.
};
