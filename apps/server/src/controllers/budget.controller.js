import { budgetService } from '../services/budget.service.js';

export const budgetController = {
  async getMonthly(req, res) {
    try {
      const userId = req.user.id;
      const year = Number(req.query.year);
      const month = Number(req.query.month);

      if (!year || !month) {
        return res.status(400).json({ message: 'year and month required' });
      }

      const budget = await budgetService.getMonthlyBudget(
        userId,
        year,
        month
      );

      res.json({ budget });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch budget' });
    }
  },

  async updateMonthly(req, res) {
    try {
      const userId = req.user.id;
      const { year, month, budgetCents, alertAtPercent } = req.body;

      if (!year || !month || budgetCents == null) {
        return res.status(400).json({ message: 'Missing fields' });
      }

      const budget = await budgetService.upsertMonthlyBudget(
        userId,
        year,
        month,
        budgetCents,
        alertAtPercent ?? 80
      );

      res.json({ budget });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to update budget' });
    }
  },

  async setNotified(req, res) {
    try {
      const userId = req.user.id;
      const { year, month } = req.body;

      if (!year || !month) {
        return res.status(400).json({ message: 'year and month required' });
      }

      const budget = await budgetService.setNotified(userId, year, month);

      if (!budget) {
        return res.status(404).json({ message: 'Budget not found' });
      }

      res.json({ budget });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to set notification status' });
    }
  },


};
