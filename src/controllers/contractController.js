const contractService = require('../services/contractService');

class ContractController {
    async createContract(req, res) {
        const result = await contractService.createContract(req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async getContractById(req, res) {
        const { id } = req.params;
        const result = await contractService.getContractById(id, req.user);
        return res.status(result.status).json(result.body);
    }

    async getAllContracts(req, res) {
        const { status, post_id } = req.query;
        const filters = { status, post_id };
        const result = await contractService.getAllContracts(filters, req.user);
        return res.status(result.status).json(result.body);
    }

    async getMyContracts(req, res) {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ message: 'Chỉ tenant mới có quyền xem hợp đồng của mình' });
        }

        const { status } = req.query;
        const result = await contractService.getMyContracts(req.user.id, status);
        return res.status(result.status).json(result.body);
    }

    async getLandlordContracts(req, res) {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ message: 'Chỉ landlord mới có quyền xem hợp đồng của mình' });
        }

        const { status } = req.query;
        const result = await contractService.getLandlordContracts(req.user.id, status);
        return res.status(result.status).json(result.body);
    }

    async updateContract(req, res) {
        const { id } = req.params;
        const result = await contractService.updateContract(id, req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async deleteContract(req, res) {
        const { id } = req.params;
        const result = await contractService.deleteContract(id, req.user);
        return res.status(result.status).json(result.body);
    }

    async terminateContract(req, res) {
        const { id } = req.params;
        const result = await contractService.terminateContract(id, req.user);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new ContractController();
