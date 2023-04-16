import {GraphQLError} from 'graphql';
import {Cat} from '../../interfaces/Cat';
import {locationInput} from '../../interfaces/Location';
import {UserIdWithToken} from '../../interfaces/User';
import rectangleBounds from '../../utils/rectangleBounds';
import catModel from '../models/catModel';
import {Types} from 'mongoose';

// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object

export default {
  Query: {
    cats: async () => {
      return await catModel.find();
    },
    catById: async (_parent: undefined, args: Cat) => {
      return await catModel.findById(args.id);
    },
    catsByOwner: async (_parent: undefined, args: Cat) => {
      return await catModel.find({owner: args.owner});
    },
    catsByArea: async (_parent: undefined, args: locationInput) => {
      const bounds = rectangleBounds(args.topRight, args.bottomLeft);
      return await catModel.find({
        location: {
          $geoWithin: {
            $geometry: bounds,
          },
        },
      });
    },
  },
  Mutation: {
    createCat: async (_parent: undefined, args: Cat, user: UserIdWithToken) => {
      if (!user.token) {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      args.owner = user.id as unknown as Types.ObjectId;
      console.log(args);
      const cat = new catModel(args);
      return await cat.save();
    },
    updateCat: async (_parent: undefined, args: Cat, user: UserIdWithToken) => {
      console.log('cat: ', args, '\nuser: ', user);
      let cat;
      try {
        cat = await catModel.findById(args.id);
      } catch (err) {
        console.log(err);
      }
      if (user.token && cat?.owner.id === user.id) {
        return await catModel.findByIdAndUpdate(args.id);
      } else {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
    },
    deleteCat: async (_parent: undefined, args: Cat, user: UserIdWithToken) => {
      console.log('cat: ', args, '\nuser: ', user);
      let cat;
      try {
        cat = await catModel.findById(args.id);
      } catch (err) {
        console.log(err);
      }
      if (user.token && cat?.owner.id === user.id) {
        console.log('comparison: ', cat?.owner.id, user.id);
        return await catModel.findByIdAndDelete(args.id);
      } else {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
    },
    updateCatAsAdmin: async (
      _parent: undefined,
      args: Cat,
      user: UserIdWithToken
    ) => {
      if (user.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      return await catModel.findByIdAndUpdate(args.id, args, {
        new: true,
      });
    },
    deleteCatAsAdmin: async (
      _parent: undefined,
      args: Cat,
      user: UserIdWithToken
    ) => {
      console.log('cat: ', args, '\nuser: ', user);
      const cat = await catModel.findById(args.id);
      console.log(cat);
      if (user.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: {code: 'NOT_AUTHORIZED'},
        });
      }
      return await catModel.findByIdAndDelete(args.id);
    },
  },
};
