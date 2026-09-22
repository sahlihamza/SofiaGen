import Cookies from "js-cookie";
import React, { useContext, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { Input, Label } from "@windmill/react-ui";
import { ImFacebook, ImGoogle } from "react-icons/im";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";

//internal import
import { AdminContext } from "@/context/AdminContext";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import UserServices from "@/services/UserServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import ImageLight from "@/assets/img/create-account-office.jpeg";
import ImageDark from "@/assets/img/create-account-office-dark.jpeg";
import { Button } from "@sofia/ui";

const SignUp = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { dispatch } = useContext(AdminContext);
  const history = useHistory();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: "onChange" });

  const onSubmit = async ({ name, email, password }) => {
    setLoading(true);

    const cookieOptions = {
      expires: 0.5,
      sameSite: window.location.protocol === "https:" ? "None" : "Lax",
      secure: window.location.protocol === "https:",
    };

    try {
      const res = await UserServices.registerAdmin({
        name,
        email,
        password,
      });

      if (res) {
        const userData = res.data || res;
        notifySuccess("Register Success!");
        dispatch({ type: "USER_LOGIN", payload: userData });
        Cookies.set("adminInfo", JSON.stringify(userData), cookieOptions);
        Cookies.set(
          "company",
          userData.company || userData.storeId || userData._id,
          cookieOptions,
        );
        history.replace("/");
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 h-full max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex flex-col overflow-y-auto md:flex-row">
          <div className="h-32 md:h-auto md:w-1/2">
            <img
              aria-hidden="true"
              className="object-cover w-full h-full dark:hidden"
              src={ImageLight}
              alt="Office"
            />
            <img
              aria-hidden="true"
              className="hidden object-cover w-full h-full dark:block"
              src={ImageDark}
              alt="Office"
            />
          </div>
          <main className="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
            <div className="w-full">
              <h1 className="mb-6 text-2xl font-semibold text-gray-700 dark:text-gray-200">
                {t("CreateAccount")}
              </h1>
              <form onSubmit={handleSubmit((data) => onSubmit(data, "signup"))}>
                <LabelArea label="Name" />
                <InputArea
                  required={true}
                  register={register}
                  label="Name"
                  name="name"
                  type="text"
                  placeholder="Admin"
                />
                <Error errorName={errors.name} />
                <LabelArea label="Email" />
                <InputArea
                  required={true}
                  register={register}
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="john@doe.com"
                />
                <Error errorName={errors.email} />

                <LabelArea label="Password" />
                <InputArea
                  required={true}
                  register={register}
                  label="Password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="***************"
                  rules={{
                    minLength: {
                      value: 8,
                      message:
                        "Le mot de passe doit contenir au moins 8 caractÃ¨res",
                    },
                  }}
                />
                <Error errorName={errors.password} />

                {/* <LabelArea label="Staff Role" />
                <div className="col-span-8 sm:col-span-4">
                  <SelectRole register={register} label="Role" name="role" />
                  <Error errorName={errors.role} />
                </div> */}

<div>
  <Label className="mt-6" check>
    <Input
      type="checkbox"
      {...register("acceptTerms", {
        required: "Vous devez accepter les conditions d'utilisation",
      })}
    />
    <span className="ml-2">
      {t("Iagree")}{" "}
      <span className="underline">{t("privacyPolicy")}</span>
    </span>
  </Label>

  {/* Message en dessous sur une nouvelle ligne */}
  <Error errorName={errors.acceptTerms} />
</div>

                <Button
                  disabled={loading || !isValid}
                  type="submit"
                  className="mt-4 h-12 w-full"
                  to="/dashboard"
                  block
                >
                  {t("CreateAccountTitle")}
                </Button>
              </form>

              <hr className="my-10" />

              <Button
                disabled
                className="text-sm inline-flex items-center cursor-pointer transition ease-in-out duration-300 font-semibold font-serif text-center justify-center rounded-md focus:outline-none text-gray-700 bg-gray-100 shadow-sm my-2 md:px-2 lg:px-3 py-4 md:py-3.5 lg:py-4 hover:text-white hover:bg-blue-600 h-11 md:h-12 w-full mr-2"
              >
                <ImFacebook className="w-4 h-4 mr-2" />{" "}
                <span className="ml-2"> {t("LoginWithFacebook")} </span>
              </Button>
              <Button
                disabled
                className="text-sm inline-flex items-center cursor-pointer transition ease-in-out duration-300 font-semibold font-serif text-center justify-center rounded-md focus:outline-none text-gray-700 bg-gray-100 shadow-sm my-2  md:px-2 lg:px-3 py-4 md:py-3.5 lg:py-4 hover:text-white hover:bg-red-500 h-11 md:h-12 w-full"
              >
                <ImGoogle className="w-4 h-4 mr-2" />{" "}
                <span className="ml-2">{t("LoginWithGoogle")}</span>
              </Button>

              <p className="mt-4">
                <Link
                  className="text-sm font-medium text-emerald-500 dark:text-emerald-400 hover:underline"
                  to="/login"
                >
                  {t("AlreadyAccount")}
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
