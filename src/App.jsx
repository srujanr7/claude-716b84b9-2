import { useMemo, useState } from "react";

const toPaise = (v) => Math.round(parseFloat(v) * 100);
const fmt = (p) =>
  "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let nextId = 1;
const uid = () => nextId++;

export default function App() {
  const [people, setPeople] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [error, setError] = useState("");

  const nameOf = (id) => people.find((p) => p.id === id)?.name ?? "?";

  const addPerson = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (people.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      setError(`"${n}" is already in the group.`);
      return;
    }
    const id = uid();
    setPeople([...people, { id, name: n }]);
    setSplitAmong([...splitAmong, id]);

    if (!payer) setPayer(String(id));
    setName("");
    setError("");
  };

  const isInvolved = (id) =>
    expenses.some((x) => x.payer === id || x.splitAmong.includes(id));

  const removePerson = (id) => {
    if (isInvolved(id)) return;
    const rest = people.filter((p) => p.id !== id);
    setPeople(rest);
    setSplitAmong(splitAmong.filter((x) => x !== id));
    if (payer === String(id)) setPayer(rest[0] ? String(rest[0].id) : "");
  };

  const toggleSplit = (id) =>
    setSplitAmong((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addExpense = (e) => {
    e.preventDefault();
    const paise = toPaise(amount);
    if (!desc.trim()) return setError("Add a description.");
    if (!paise || paise <= 0) return setError("Enter an amount greater than zero.");
    if (!payer) return setError("Choose who paid.");
    if (splitAmong.length === 0) return setError("Pick at least one person to split with.");
    setExpenses([
      ...expenses,
      { id: uid(), desc: desc.trim(), amount: paise, payer: Number(payer), splitAmong: [...splitAmong] },
    ]);
    setDesc("");
    setAmount("");

    setError("");
  };

  const removeExpense = (id) => setExpenses(expenses.filter((x) => x.id !== id));

  const { balances, settlements, total } = useMemo(() => {
    const bal = {};
    people.forEach((p) => (bal[p.id] = 0));
    let total = 0;

    expenses.forEach((x) => {
      total += x.amount;
      bal[x.payer] += x.amount;
      const n = x.splitAmong.length;
      const base = Math.floor(x.amount / n);
      let rem = x.amount - base * n;
      x.splitAmong.forEach((pid) => {
        const share = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        bal[pid] -= share;
      });
    });

    const debtors = [];
    const creditors = [];
    Object.entries(bal).forEach(([id, v]) => {
      if (v < 0) debtors.push({ id: Number(id), amt: -v });
      else if (v > 0) creditors.push({ id: Number(id), amt: v });
    });
    debtors.sort((a, b) => b.amt - a.amt);
    creditors.sort((a, b) => b.amt - a.amt);


    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
      if (debtors[i].amt === 0) i++;
      if (creditors[j].amt === 0) j++;
    }

    return { balances: bal, settlements, total };
  }, [people, expenses]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Expense Splitter</h1>
          <p className="text-slate-500">Add people, log expenses, and see who owes whom.</p>
        </header>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* People */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-lg font-semibold mb-3">People</h2>
          <form onSubmit={addPerson} className="flex gap-2">

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700">
              Add
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            {people.length === 0 && <p className="text-sm text-slate-400">No one added yet.</p>}
            {people.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-sm"
              >
                {p.name}
                <button
                  onClick={() => removePerson(p.id)}
                  disabled={isInvolved(p.id)}
                  title={isInvolved(p.id) ? "Remove their expenses first" : "Remove"}
                  className="text-indigo-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Add expense */}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-lg font-semibold mb-3">Add expense</h2>
          {people.length === 0 ? (
            <p className="text-sm text-slate-400">Add at least one person first.</p>
          ) : (
            <form onSubmit={addExpense} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Description (e.g. Dinner)"
                  className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (₹)"
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Paid by</label>
                <select
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>

                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Split among</span>
                  <div className="space-x-3 text-xs">
                    <button type="button" onClick={() => setSplitAmong(people.map((p) => p.id))} className="text-indigo-600 hover:underline">
                      All
                    </button>
                    <button type="button" onClick={() => setSplitAmong([])} className="text-indigo-600 hover:underline">
                      None
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => {
                    const on = splitAmong.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleSplit(p.id)}
                        className={`rounded-full px-3 py-1 text-sm border transition ${
                          on
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-300 text-slate-500"
                        }`}
                      >
                        {p.name}

                      </button>
                    );
                  })}
                </div>
              </div>
              <button className="w-full rounded-lg bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700">
                Add expense
              </button>
            </form>
          )}
        </section>

        {/* Expenses list */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold">Expenses</h2>
            <span className="text-sm text-slate-500">Total: {fmt(total)}</span>
          </div>
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expenses.map((x) => (
                <li key={x.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{x.desc}</p>
                    <p className="text-xs text-slate-500">
                      {nameOf(x.payer)} paid · split among {x.splitAmong.map(nameOf).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{fmt(x.amount)}</span>

                    <button onClick={() => removeExpense(x.id)} className="text-slate-400 hover:text-red-500" title="Delete">
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Balances & settlements */}
        {people.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-lg font-semibold mb-3">Balances</h2>
              <ul className="space-y-2">
                {people.map((p) => {
                  const v = balances[p.id] ?? 0;
                  return (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span>{p.name}</span>
                      <span
                        className={`tabular-nums font-medium ${
                          v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "text-slate-400"
                        }`}
                      >
                        {v > 0 ? "gets " : v < 0 ? "owes " : ""}
                        {fmt(Math.abs(v))}
                      </span>
                    </li>
                  );
                })}

              </ul>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-lg font-semibold mb-3">Who owes whom</h2>
              {settlements.length === 0 ? (
                <p className="text-sm text-slate-400">All settled up 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {settlements.map((s, i) => (
                    <li key={i} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                      <span>
                        <span className="font-medium text-red-600">{nameOf(s.from)}</span>
                        <span className="text-slate-400"> → </span>
                        <span className="font-medium text-emerald-600">{nameOf(s.to)}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{fmt(s.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}