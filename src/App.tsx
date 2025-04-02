
import React, { useState } from 'react';
import { PlusCircle, Receipt, Users, Wallet, DollarSign, ArrowRight, ArrowRightLeft, Pencil, Trash2, X, UserPlus, Home, User, Users2 } from 'lucide-react';

const Index = () => {
  const [people, setPeople] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payer, setPayer] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('add-people');
  const [editingExpense, setEditingExpense] = useState<number | null>(null);
  const [families, setFamilies] = useState<Record<string, string[]>>({});
  const [familyHeads, setFamilyHeads] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'individual' | 'family'>('individual');

  const addFamily = () => {
    const head = (document.getElementById("familyHeadInput") as HTMLInputElement)?.value.trim();
    const members = (document.getElementById("familyMembersInput") as HTMLInputElement)?.value
      .split(',')
      .map(member => member.trim())
      .filter(member => member && people.includes(member));

    if (head && members.length > 0 && people.includes(head)) {
      setFamilies(prev => ({
        ...prev,
        [head]: members
      }));
      setFamilyHeads(prev => ({
        ...prev,
        ...members.reduce((acc, member) => ({ ...acc, [member]: head }), {})
      }));
    }

    (document.getElementById("familyHeadInput") as HTMLInputElement).value = "";
    (document.getElementById("familyMembersInput") as HTMLInputElement).value = "";
  };

  const addPerson = () => {
    const name = (document.getElementById("nameInput") as HTMLInputElement)?.value.trim();
    if (name && !people.includes(name)) {
      setPeople([...people, name]);
    }
    (document.getElementById("nameInput") as HTMLInputElement).value = "";
  };

  const addExpense = () => {
    if (payer && item && amount && selectedUsers.length > 0) {
      if (editingExpense !== null) {
        const updatedExpenses = [...expenses];
        updatedExpenses[editingExpense] = {
          payer,
          item,
          amount: parseFloat(amount),
          sharedAmong: [...selectedUsers],
        };
        setExpenses(updatedExpenses);
        setEditingExpense(null);
      } else {
        setExpenses([
          ...expenses,
          { payer, item, amount: parseFloat(amount), sharedAmong: [...selectedUsers] },
        ]);
      }
      setPayer("");
      setItem("");
      setAmount("");
      setSelectedUsers([]);
    }
  };

  const startEditExpense = (index: number) => {
    const expense = expenses[index];
    setPayer(expense.payer);
    setItem(expense.item);
    setAmount(expense.amount.toString());
    setSelectedUsers(expense.sharedAmong);
    setEditingExpense(index);
    setActiveTab('add-expense');
  };

  const cancelEdit = () => {
    setPayer("");
    setItem("");
    setAmount("");
    setSelectedUsers([]);
    setEditingExpense(null);
  };

  const deleteExpense = (index: number) => {
    const updatedExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(updatedExpenses);
  };

  const handleUserSelection = (user: string) => {
    setSelectedUsers((prev) =>
      prev.includes(user) ? prev.filter((u) => u !== user) : [...prev, user]
    );
  };

  const calculateExpenses = () => {
    let individualExpenses: Record<string, any> = {};
    people.forEach((person) => {
      individualExpenses[person] = {
        paid: 0,
        commonShare: 0,
        exclusiveShare: 0,
        totalShare: 0,
        netAmount: 0,
      };
    });

    expenses.forEach(({ payer, amount, sharedAmong }) => {
      individualExpenses[payer].paid += amount;

      if (sharedAmong.length === 1) {
        individualExpenses[sharedAmong[0]].exclusiveShare += amount;
      } else {
        let sharePerPerson = amount / sharedAmong.length;
        sharedAmong.forEach((user: string) => {
          individualExpenses[user].commonShare += sharePerPerson;
        });
      }
    });

    people.forEach((person) => {
      individualExpenses[person].totalShare =
        individualExpenses[person].commonShare +
        individualExpenses[person].exclusiveShare;
      individualExpenses[person].netAmount =
        individualExpenses[person].paid - individualExpenses[person].totalShare;
    });

    return individualExpenses;
  };

  const calculateIndividualSettlements = () => {
    const individualExpenses = calculateExpenses();
    let settlements: { from: string; to: string; amount: number }[] = [];
    
    let debtors = people
      .filter(person => individualExpenses[person].netAmount < 0)
      .map(person => ({
        name: person,
        amount: Math.abs(individualExpenses[person].netAmount)
      }))
      .sort((a, b) => b.amount - a.amount);
    
    let creditors = people
      .filter(person => individualExpenses[person].netAmount > 0)
      .map(person => ({
        name: person,
        amount: individualExpenses[person].netAmount
      }))
      .sort((a, b) => b.amount - a.amount);
    
    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];
      
      const settlementAmount = Math.min(debtor.amount, creditor.amount);
      
      if (settlementAmount >= 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Number(settlementAmount.toFixed(2))
        });
      }
      
      debtor.amount = Number((debtor.amount - settlementAmount).toFixed(2));
      creditor.amount = Number((creditor.amount - settlementAmount).toFixed(2));
      
      if (debtor.amount < 0.01) debtors.shift();
      if (creditor.amount < 0.01) creditors.shift();
    }
    
    return settlements;
  };

  const calculateFinalSettlements = () => {
    const individualExpenses = calculateExpenses();
    
    // Step 1: Consolidate balances by family
    let familyBalances: Record<string, number> = {};
    
    // Initialize with all family heads
    Object.keys(families).forEach(head => {
      familyBalances[head] = 0;
    });
    
    // Process each person's balance
    people.forEach(person => {
      const belongsToFamily = familyHeads[person]; // Will be undefined for independent people
      const isFamilyHead = families[person]; // Will be defined for family heads
      
      if (belongsToFamily) {
        // Person belongs to a family, add their balance to the family head's balance
        if (!familyBalances[belongsToFamily]) {
          familyBalances[belongsToFamily] = 0;
        }
        familyBalances[belongsToFamily] += individualExpenses[person].netAmount;
      } else if (isFamilyHead) {
        // Person is a family head, add their own balance
        familyBalances[person] += individualExpenses[person].netAmount;
      } else {
        // Person is independent, track their balance directly
        familyBalances[person] = individualExpenses[person].netAmount;
      }
    });
    
    // Round balances to 2 decimal places to avoid floating-point issues
    Object.keys(familyBalances).forEach(person => {
      familyBalances[person] = Number(familyBalances[person].toFixed(2));
    });
    
    // Step 2: Calculate settlements between family heads and independent people
    let settlements: { from: string; to: string; amount: number; isFamily: boolean }[] = [];
    
    let debtors = Object.entries(familyBalances)
      .filter(([_, amount]) => amount < 0)
      .map(([person, amount]) => ({
        person,
        amount: Math.abs(amount)
      }))
      .sort((a, b) => b.amount - a.amount);
    
    let creditors = Object.entries(familyBalances)
      .filter(([_, amount]) => amount > 0)
      .map(([person, amount]) => ({
        person,
        amount
      }))
      .sort((a, b) => b.amount - a.amount);
    
    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];
      
      const settlementAmount = Math.min(debtor.amount, creditor.amount);
      
      if (settlementAmount >= 0.01) {
        const isFromFamily = Boolean(families[debtor.person]);
        const isToFamily = Boolean(families[creditor.person]);
        
        settlements.push({
          from: debtor.person,
          to: creditor.person,
          amount: Number(settlementAmount.toFixed(2)),
          isFamily: isFromFamily || isToFamily
        });
      }
      
      debtor.amount = Number((debtor.amount - settlementAmount).toFixed(2));
      creditor.amount = Number((creditor.amount - settlementAmount).toFixed(2));
      
      if (debtor.amount < 0.01) debtors.shift();
      if (creditor.amount < 0.01) creditors.shift();
    }
    
    return settlements;
  };

  const individualExpenses = calculateExpenses();
  const individualSettlements = calculateIndividualSettlements();
  const finalSettlements = calculateFinalSettlements();

  const getMaxAmount = () => {
    return Math.max(...people.map(person => Math.abs(individualExpenses[person].netAmount)));
  };

  const maxAmount = getMaxAmount();

  const isFamilyHead = (person: string): boolean => {
    return Boolean(families[person]);
  };

  const getFamilyHead = (person: string): string => {
    return familyHeads[person] || person;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-900">
          Trip Expense Tracker
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 ${activeTab === 'add-people' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('add-people')}
          >
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Add People</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  id="nameInput"
                  type="text"
                  placeholder="Enter Name"
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addPerson}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {people.map((person, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm animate-fade-in"
                  >
                    {person}
                  </span>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center mb-4">
                  <Home className="w-6 h-6 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Create Family Group</h3>
                </div>
                <div className="space-y-3">
                  <input
                    id="familyHeadInput"
                    type="text"
                    placeholder="Family Head Name"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    id="familyMembersInput"
                    type="text"
                    placeholder="Family Members (comma-separated)"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={addFamily}
                    className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Create Family Group
                  </button>
                </div>
                
                <div className="mt-4 space-y-3">
                  {Object.entries(families).map(([head, members], index) => (
                    <div key={index} className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-purple-700">{head}'s Family</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {members.map((member, i) => (
                          <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm">
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div 
            className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 ${activeTab === 'add-expense' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('add-expense')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Receipt className="w-6 h-6 text-green-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingExpense !== null ? 'Edit Expense' : 'Add Expense'}
                </h2>
              </div>
              {editingExpense !== null && (
                <button
                  onClick={cancelEdit}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <select
                onChange={(e) => setPayer(e.target.value)}
                value={payer}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Payer</option>
                {people.map((person, index) => (
                  <option key={index} value={person}>{person}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Enter Item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Enter Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Select Users:</h3>
                <div className="flex flex-wrap gap-2">
                  {people.map((person, index) => (
                    <label
                      key={index}
                      className={`cursor-pointer flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${
                        selectedUsers.includes(person)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedUsers.includes(person)}
                        onChange={() => handleUserSelection(person)}
                      />
                      <span>{person}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={addExpense}
                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                {editingExpense !== null ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </div>

          <div 
            className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 ${activeTab === 'summary' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <div className="flex items-center mb-4">
              <Wallet className="w-6 h-6 text-purple-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Summary</h2>
            </div>
            <div className="space-y-4">
              {people.map((person, index) => (
                <div key={index} className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      {person}
                      {isFamilyHead(person) && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Family Head
                        </span>
                      )}
                      {familyHeads[person] && (
                        <span className="ml-2 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                          {familyHeads[person]}'s Family
                        </span>
                      )}
                    </span>
                    <span className={`text-sm font-semibold ${
                      individualExpenses[person].netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{individualExpenses[person].netAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        individualExpenses[person].netAmount >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${(Math.abs(individualExpenses[person].netAmount) / maxAmount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Recent Expenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Payer</th>
                  <th className="py-2 px-4 text-left">Item</th>
                  <th className="py-2 px-4 text-left">Amount</th>
                  <th className="py-2 px-4 text-left">Shared Among</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <tr
                    key={index}
                    className="border-b last:border-0 hover:bg-gray-50 transition-colors animate-fade-in"
                  >
                    <td className="py-2 px-4">{expense.payer}</td>
                    <td className="py-2 px-4">{expense.item}</td>
                    <td className="py-2 px-4">₹{expense.amount.toFixed(2)}</td>
                    <td className="py-2 px-4">
                      <div className="flex flex-wrap gap-1">
                        {expense.sharedAmong.map((user: string, i: number) => (
                          <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                            {user}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditExpense(index)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteExpense(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <ArrowRight className="w-6 h-6 text-indigo-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Detailed Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Money Given</th>
                  <th className="py-2 px-4 text-left">Common Share</th>
                  <th className="py-2 px-4 text-left">Exclusive Share</th>
                  <th className="py-2 px-4 text-left">Total Share</th>
                  <th className="py-2 px-4 text-left">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person, index) => (
                  <tr
                    key={index}
                    className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 px-4 font-medium">
                      {person}
                      {isFamilyHead(person) && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Family Head
                        </span>
                      )}
                      {familyHeads[person] && (
                        <span className="ml-2 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                          {familyHeads[person]}'s Family
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">₹{individualExpenses[person].paid.toFixed(2)}</td>
                    <td className="py-2 px-4">₹{individualExpenses[person].commonShare.toFixed(2)}</td>
                    <td className="py-2 px-4">₹{individualExpenses[person].exclusiveShare.toFixed(2)}</td>
                    <td className="py-2 px-4">₹{individualExpenses[person].totalShare.toFixed(2)}</td>
                    <td className={`py-2 px-4 font-semibold ${
                      individualExpenses[person].netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{individualExpenses[person].netAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <User className="w-6 h-6 text-orange-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Individual Settlement Plan</h2>
            </div>
            <div className="space-y-4">
              {individualSettlements.length > 0 ? (
                individualSettlements.map((settlement, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-orange-50 rounded-lg transform transition-all duration-300 hover:scale-102"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-orange-700">{settlement.from}</span>
                      <ArrowRight className="w-5 h-5 text-orange-500" />
                      <span className="font-medium text-orange-700">{settlement.to}</span>
                    </div>
                    <span className="font-bold text-orange-600">₹{settlement.amount.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No settlements needed!</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Users2 className="w-6 h-6 text-purple-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Final Settlement Plan</h2>
              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Family Consolidated
              </span>
            </div>
            <div className="space-y-4">
              {finalSettlements.length > 0 ? (
                finalSettlements.map((settlement, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-purple-50 rounded-lg transform transition-all duration-300 hover:scale-102"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="font-medium text-purple-700">{settlement.from}</span>
                        {families[settlement.from] && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Family Head
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-500" />
                      <div>
                        <span className="font-medium text-purple-700">{settlement.to}</span>
                        {families[settlement.to] && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Family Head
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-purple-600">₹{settlement.amount.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No settlements needed!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;