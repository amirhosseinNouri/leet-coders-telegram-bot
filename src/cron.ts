import cronstrue from 'cronstrue';

const getHumanReadableCronExpression = () =>
  `${cronstrue.toString(String(process.env.CRON_REGEX))} (${
    process.env.TIMEZONE
  } timezone)`;

export { getHumanReadableCronExpression };
