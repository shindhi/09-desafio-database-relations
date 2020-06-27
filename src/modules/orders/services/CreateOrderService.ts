import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomer = await this.customersRepository.findById(customer_id);

    if (!checkCustomer) {
      throw new AppError('Customer not found.');
    }

    const idsProducts = products.map(product => ({
      id: product.id,
    }));

    const arrProducts = await this.productsRepository.findAllById(idsProducts);

    if (arrProducts.length !== products.length) {
      throw new AppError('Product not found.');
    }

    const productAndPrice = arrProducts.map((item, index) => {
      return {
        product_id: products[index].id,
        quantity: products[index].quantity,
        price: item.price,
      };
    });

    const productsUpdate = arrProducts.map((item, index) => {
      if (productAndPrice[index].quantity > item.quantity) {
        throw new AppError('Insufficient quantities.');
      }

      return Object.assign(item, {
        quantity: item.quantity - productAndPrice[index].quantity,
      });
    });

    await this.productsRepository.updateQuantity(productsUpdate);

    const order = await this.ordersRepository.create({
      customer: checkCustomer,
      products: productAndPrice,
    });

    return order;
  }
}

export default CreateOrderService;
