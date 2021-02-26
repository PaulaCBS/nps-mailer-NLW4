import { Request, Response } from 'express';
import { resolve } from "path";
import { getCustomRepository } from 'typeorm';
import { UserRepository } from '../repositories/UserRepository';
import { SurveysRepository } from '../repositories/SurveysRepository';
import { SurveysUsersRepository } from '../repositories/SurveysUsersRepository';
import SendMailService from '../services/SendMailService';
import { AppError } from '../errors/AppErrors';

class SendMailController{
  async execute(request: Request, response: Response) {
    const { email, survey_id } = request.body;

    const userRepository = getCustomRepository(UserRepository);
    const surveysRepository = getCustomRepository(SurveysRepository);
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

    const user = await userRepository.findOne({email});
    if (!user) {
      throw new AppError("User does not exists!");
    }

    const survey = await surveysRepository.findOne({id: survey_id});
    if (!survey) {
      throw new AppError("Survey does not exists!");
    }

    const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");

    const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
      where: { user_id: user.id, value: null, survey_id: survey_id },
      relations: [
        "user",
        "survey"
      ]
    });

    const variables = {
      name: user,
      title: survey.title,
      description: survey.description,
      id: "",
      link: process.env.URl_MAIL
    }

    if (surveyUserAlreadyExists) {
      variables.id = surveyUserAlreadyExists.id;
      await SendMailService.execute( email, survey.title, variables, npsPath );
      return response.json(surveyUserAlreadyExists);
    }

    const surveyUser = surveysUsersRepository.create({
      user_id: user.id,
      survey_id
    })
    await surveysUsersRepository.save(surveyUser);

    variables.id = surveyUser.id;

    await SendMailService.execute(email, survey.title, variables, npsPath)

    return response.status(201).json(surveyUser)
  }
}

export { SendMailController }