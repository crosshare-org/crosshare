export const I18nTags = (props: {
  locale: string;
  canonicalPath: string;
}): JSX.Element => {
  const localePart = props.locale == 'en' ? '' : `/${props.locale}`;
  return (
    <>
      <link
        rel="canonical"
        href={`https://crosshare.org${localePart}${props.canonicalPath}`}
      />
      <link
        rel="alternate"
        hrefLang="en"
        href={`https://crosshare.org${props.canonicalPath}`}
      />
      <link
        rel="alternate"
        hrefLang="es"
        href={`https://crosshare.org/es${props.canonicalPath}`}
      />
      <link
        rel="alternate"
        hrefLang="it"
        href={`https://crosshare.org/it${props.canonicalPath}`}
      />
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`https://crosshare.org${props.canonicalPath}`}
      />
    </>
  );
};
