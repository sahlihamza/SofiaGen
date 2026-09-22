const Invoice = ({ data, currency, getNumberTwo }) => {
  return (
    <tbody className="divide-y divide-[#f0f0f1] text-sm dark:divide-gray-700">
      {data?.cart?.map((item, i) => (
        <tr key={i}>
          <td className="px-4 py-3 text-left text-[#646970] dark:text-gray-400">
            {i + 1}
          </td>
          <td className="px-4 py-3">
            <span className="font-medium text-[#1d2327] dark:text-gray-200">
              {item.title}
            </span>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-center text-[#1d2327] dark:text-gray-300">
            {item.quantity}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-center text-[#1d2327] dark:text-gray-300">
            {currency}
            {getNumberTwo(item.price)}
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#1d2327] dark:text-gray-200">
            {currency}
            {getNumberTwo(item.itemTotal)}
          </td>
        </tr>
      ))}
    </tbody>
  );
};

export default Invoice;
